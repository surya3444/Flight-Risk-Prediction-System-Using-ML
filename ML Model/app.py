import os
import logging

import joblib
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

from risk_schema import (
    BENIGN_BASELINE,
    CATEGORICAL_COLS,
    FEATURE_LABELS,
    FEATURE_ORDER,
    REQUIRED_FIELDS,
    band_for,
)

app = Flask(__name__)
CORS(app)

# Logging setup
logging.basicConfig(level=logging.INFO)

# Rate limiter. The monitoring scheduler re-scores every tracked flight on a
# fixed cadence, so the ceiling has to accommodate sustained batch traffic.
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["600 per hour"]
)

# API key from environment variable
API_KEY = os.getenv("API_KEY", "supersecretkey123")

MODEL_VERSION = os.getenv("MODEL_VERSION", "rf-150-v1")

MAX_BATCH_SIZE = 50

# Load trained ML model
model = joblib.load("flight_risk_model.pkl")

# Load encoders
encoders = joblib.load("encoders.pkl")


def require_api_key():
    """Returns an error response when the caller is not authorised, else None."""
    if request.headers.get("x-api-key") != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401
    return None


def validate(payload):
    """Returns a list of problems with a single flight payload."""
    if not isinstance(payload, dict):
        return ["payload must be a JSON object"]

    problems = []
    for field in REQUIRED_FIELDS:
        if field not in payload:
            problems.append(f"Missing field: {field}")

    for col in CATEGORICAL_COLS:
        value = payload.get(col)
        if value is None:
            continue
        if value not in list(encoders[col].classes_):
            allowed = ", ".join(map(str, encoders[col].classes_))
            problems.append(f"Unknown value '{value}' for {col} (expected one of: {allowed})")

    return problems


def encode(payload):
    """Maps one raw flight dict onto the encoded feature vector the model expects."""
    row = {}
    for col in FEATURE_ORDER:
        value = payload[col]
        if col in CATEGORICAL_COLS:
            value = int(encoders[col].transform([value])[0])
        row[col] = value
    return row


def attribute(payload, encoded_row, probability):
    """Leave-one-out counterfactual attribution.

    For every feature we can meaningfully neutralise, swap in the benign
    baseline value and re-score. The drop in probability is how much that
    feature is contributing to the risk right now. This is a genuine
    model-derived explanation rather than global feature importance, so two
    flights that share a top-importance feature can still get different reasons.

    All counterfactuals go through the model in a single predict_proba call.
    """
    counterfactual_cols = []
    rows = []

    for col in FEATURE_ORDER:
        baseline = BENIGN_BASELINE.get(col)
        if baseline is None:
            # Identity-like features (operator, aircraft type, season) have no
            # meaningful "safe" value to swap in.
            continue

        if col in CATEGORICAL_COLS:
            encoded_baseline = int(encoders[col].transform([baseline])[0])
        else:
            encoded_baseline = baseline

        if encoded_row[col] == encoded_baseline:
            continue

        variant = dict(encoded_row)
        variant[col] = encoded_baseline
        rows.append(variant)
        counterfactual_cols.append(col)

    if not rows:
        return []

    frame = pd.DataFrame(rows, columns=FEATURE_ORDER)
    counterfactual_probs = model.predict_proba(frame)[:, 1]

    factors = []
    for col, cf_prob in zip(counterfactual_cols, counterfactual_probs):
        impact = float(probability - cf_prob)
        if impact <= 0.01:
            continue
        factors.append({
            "feature": col,
            "label": FEATURE_LABELS.get(col, col),
            "value": payload[col],
            "benign_value": BENIGN_BASELINE[col],
            # How much of the current risk probability disappears if this one
            # factor were nominal.
            "impact": round(impact, 4),
        })

    factors.sort(key=lambda f: f["impact"], reverse=True)
    return factors[:5]


def score(payload, explain=True):
    """Scores one validated flight payload."""
    encoded_row = encode(payload)
    frame = pd.DataFrame([encoded_row], columns=FEATURE_ORDER)

    probability = float(model.predict_proba(frame)[0][1])
    prediction = int(model.predict(frame)[0])

    result = {
        "risk_prediction": prediction,
        "risk_probability": probability,
        "risk_band": band_for(probability),
        "model_version": MODEL_VERSION,
    }

    if explain:
        result["contributing_factors"] = attribute(payload, encoded_row, probability)

    return result


@app.route("/")
def home():
    return {"message": "Flight Risk Prediction API is running", "version": MODEL_VERSION}


@app.route("/health")
@limiter.exempt
def health():
    """Unauthenticated liveness probe — the Node scheduler checks this before it
    fans out a monitoring cycle."""
    return jsonify({
        "status": "ok",
        "model_version": MODEL_VERSION,
        "features": len(FEATURE_ORDER),
    })


@app.route("/predict", methods=["POST"])
@limiter.limit("120 per minute")
def predict():
    unauthorized = require_api_key()
    if unauthorized:
        return unauthorized

    data = request.get_json(silent=True)
    if not data:
        return jsonify({"error": "Invalid JSON input"}), 400

    problems = validate(data)
    if problems:
        return jsonify({"error": problems[0], "problems": problems}), 400

    explain = request.args.get("explain", "true").lower() != "false"

    try:
        result = score(data, explain=explain)
        logging.info("Prediction processed: p=%.3f band=%s", result["risk_probability"], result["risk_band"])
        return jsonify(result)
    except Exception as e:
        logging.exception("Prediction failed")
        return jsonify({"error": "Prediction failed", "detail": str(e)}), 500


@app.route("/predict/batch", methods=["POST"])
@limiter.limit("60 per minute")
def predict_batch():
    """Scores up to MAX_BATCH_SIZE flights in one round trip.

    One bad flight does not fail the batch — each entry carries its own
    success/error so a monitoring cycle can partially succeed.
    """
    unauthorized = require_api_key()
    if unauthorized:
        return unauthorized

    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload.get("flights"), list):
        return jsonify({"error": "Expected {\"flights\": [...]}"}), 400

    flights = payload["flights"]
    if not flights:
        return jsonify({"results": []})
    if len(flights) > MAX_BATCH_SIZE:
        return jsonify({"error": f"Batch too large (max {MAX_BATCH_SIZE})"}), 400

    explain = payload.get("explain", True)

    results = []
    for index, flight in enumerate(flights):
        reference = flight.get("reference", index)
        body = flight.get("data", flight)

        problems = validate(body)
        if problems:
            results.append({"reference": reference, "ok": False, "error": problems[0]})
            continue

        try:
            results.append({"reference": reference, "ok": True, **score(body, explain=explain)})
        except Exception as e:
            logging.exception("Batch entry %s failed", reference)
            results.append({"reference": reference, "ok": False, "error": str(e)})

    logging.info("Batch processed: %d flights", len(results))
    return jsonify({"results": results, "model_version": MODEL_VERSION})


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(host="0.0.0.0", port=port)

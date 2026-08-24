import os
import logging

import joblib
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

import mitigations

from risk_schema import (
    BENIGN_BASELINE,
    describe_condition,
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

# API key from environment variable.
#
# The fallback exists so a fresh clone runs without setup, but it is published
# in this repository and therefore protects nothing. Anything reachable from
# the internet must set API_KEY properly.
DEFAULT_API_KEY = "supersecretkey123"
API_KEY = os.getenv("API_KEY", DEFAULT_API_KEY)

if API_KEY == DEFAULT_API_KEY:
    logging.warning(
        "API_KEY is the built-in default, which is public in this repository. "
        "Fine on localhost; set a real API_KEY before exposing this service."
    )

MODEL_VERSION = os.getenv("MODEL_VERSION", "rf-150-v1")

MAX_BATCH_SIZE = 50

# Smallest contribution worth showing an operator, in probability points.
MIN_FACTOR_IMPACT = 0.03

# An action has to move the risk by at least this much to be worth the
# operational cost of doing it.
MIN_MITIGATION_EFFECT = 0.03
MAX_RECOMMENDATIONS = 4

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


def _encoded_baseline_row(encoded_row):
    """The same flight with every neutralisable condition set to nominal.

    Identity-like features (operator, aircraft type, season) are carried over
    from the real flight, so the reference is *this* aircraft on a good day —
    not a generic average.
    """
    row = dict(encoded_row)
    for col in FEATURE_ORDER:
        baseline = BENIGN_BASELINE.get(col)
        if baseline is None:
            continue
        row[col] = (
            int(encoders[col].transform([baseline])[0])
            if col in CATEGORICAL_COLS
            else baseline
        )
    return row


def attribute(payload, encoded_row, probability):
    """Per-condition risk attribution.

    Two measures, because they answer different questions and neither is
    sufficient alone:

    * ``impact`` — **standalone contribution**. Start from this same aircraft
      on a nominal day and switch on this one condition. How far does risk
      rise? This is what "Heavy rain +20%" means, and it is immune to
      redundancy: a storm that would raise risk 30 points on its own still
      reports 30 points even when four other severe conditions are also
      present.

    * ``marginal`` — **leave-one-out**. Remove this condition from the flight
      as it actually stands. How much does risk fall? This is what a dispatcher
      would gain by fixing it *now*, and it collapses toward zero when other
      conditions independently pin the risk high.

    The headline number is ``impact``. Reporting only ``marginal`` was the
    earlier behaviour and it was actively misleading: a 96.7% flight in a
    thunderstorm with 1.5 km visibility listed no weather factors at all,
    because removing any single one still left the rest holding risk at the
    ceiling.

    Every counterfactual — both directions — goes through the model in one
    predict_proba call.
    """
    baseline_row = _encoded_baseline_row(encoded_row)

    candidates = []
    for col in FEATURE_ORDER:
        baseline = BENIGN_BASELINE.get(col)
        if baseline is None:
            continue
        if encoded_row[col] == baseline_row[col]:
            # Already nominal — nothing to attribute.
            continue
        candidates.append(col)

    if not candidates:
        return []

    rows = [baseline_row]                       # index 0: the nominal reference

    for col in candidates:                      # "switch this one on"
        variant = dict(baseline_row)
        variant[col] = encoded_row[col]
        rows.append(variant)

    for col in candidates:                      # "switch this one off"
        variant = dict(encoded_row)
        variant[col] = baseline_row[col]
        rows.append(variant)

    probs = model.predict_proba(pd.DataFrame(rows, columns=FEATURE_ORDER))[:, 1]

    baseline_prob = float(probs[0])
    n = len(candidates)
    standalone_probs = probs[1:1 + n]
    removed_probs = probs[1 + n:1 + 2 * n]

    factors = []
    for col, alone_prob, removed_prob in zip(candidates, standalone_probs, removed_probs):
        impact = float(alone_prob) - baseline_prob
        marginal = probability - float(removed_prob)

        # Only surface conditions that genuinely push risk up. A 1-point
        # wobble is model noise, and listing it beside a 60-point storm
        # teaches an operator to distrust the whole panel.
        # Filter on the headline measure only. A condition with ~0 standalone
        # impact but a large marginal one is real (it matters only in
        # combination), but showing it as "+0%" beside a 60-point storm reads
        # as a bug. Its marginal value still travels in the payload.
        if impact < MIN_FACTOR_IMPACT:
            continue

        phrase, measurement = describe_condition(col, payload[col])

        factors.append({
            "feature": col,
            "label": phrase,
            "detail": measurement,
            "feature_label": FEATURE_LABELS.get(col, col),
            "value": payload[col],
            "benign_value": BENIGN_BASELINE[col],
            # Headline: what this condition adds on its own.
            "impact": round(max(impact, 0.0), 4),
            # Secondary: what removing it right now would recover.
            "marginal": round(marginal, 4),
        })

    factors.sort(key=lambda f: (f["impact"], f["marginal"]), reverse=True)

    return {
        "baseline_probability": round(baseline_prob, 4),
        "factors": factors[:6],
    }


def recommend(payload, probability):
    """Ranks operational mitigations by the risk reduction the model predicts.

    Nothing here is asserted. Each candidate action is applied to the flight
    vector, the result is re-scored, and the recommendation carries the risk
    that actually comes back. Actions that fail to move the number are dropped,
    so the panel never pads itself with advice that would not help.

    A combined entry is included when several actions each help, because
    conditions overlap: on a flight where three things are wrong, doing one of
    them often barely moves the risk while doing all three moves it a lot.

    Every counterfactual goes through the model in a single predict_proba call.
    """
    candidates = mitigations.available(payload)
    if not candidates:
        return []

    variants = []
    applied_sets = []

    for m in candidates:
        changes = m["apply"](payload)
        merged = {**payload, **changes}
        variants.append(encode(merged))
        applied_sets.append((m, changes, merged))

    probs = model.predict_proba(pd.DataFrame(variants, columns=FEATURE_ORDER))[:, 1]

    scored = []
    for (m, changes, merged), new_prob in zip(applied_sets, probs):
        reduction = probability - float(new_prob)
        if reduction < MIN_MITIGATION_EFFECT:
            continue
        scored.append({
            "id": m["id"],
            "action": m["label"],
            "category": m["category"],
            "detail": m["describe"](payload, merged),
            "risk_before": round(probability, 4),
            "risk_after": round(float(new_prob), 4),
            "reduction": round(reduction, 4),
            "disruption": m["disruption"],
            "_changes": changes,
        })

    # Most effective first; where two actions help equally, prefer the one that
    # disrupts the operation least.
    scored.sort(key=lambda r: (-r["reduction"], r["disruption"]))

    top = scored[:MAX_RECOMMENDATIONS]

    combined = None
    if len(top) > 1:
        stacked = dict(payload)
        for r in top[:3]:
            stacked.update(r["_changes"])
        stacked_prob = float(
            model.predict_proba(pd.DataFrame([encode(stacked)], columns=FEATURE_ORDER))[0][1]
        )
        stacked_reduction = probability - stacked_prob
        # Only worth showing if the combination beats the best single action.
        if stacked_reduction > top[0]["reduction"] + 0.01:
            combined = {
                "actions": [r["action"] for r in top[:3]],
                "risk_after": round(stacked_prob, 4),
                "reduction": round(stacked_reduction, 4),
            }

    for r in top:
        del r["_changes"]

    return {"recommendations": top, "combined": combined}


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
        attribution = attribute(payload, encoded_row, probability)
        result["contributing_factors"] = attribution["factors"] if attribution else []
        # Risk this same aircraft would carry on a nominal day — the reference
        # the standalone contributions are measured from.
        result["baseline_probability"] = (
            attribution["baseline_probability"] if attribution else None
        )

        advice = recommend(payload, probability)
        result["recommendations"] = advice["recommendations"] if advice else []
        result["combined_recommendation"] = advice["combined"] if advice else None

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

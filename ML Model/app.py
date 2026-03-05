import os
import logging
import joblib
import pandas as pd

from flask import Flask, request, jsonify
from flask_cors import CORS

from flask_limiter import Limiter
from flask_limiter.util import get_remote_address


app = Flask(__name__)
CORS(app)

# Logging setup
logging.basicConfig(level=logging.INFO)

# Rate limiter
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=["100 per hour"]
)

# API key from environment variable
API_KEY = os.getenv("API_KEY", "supersecretkey123")

# Load trained ML model
model = joblib.load("flight_risk_model.pkl")

# Load encoders
encoders = joblib.load("encoders.pkl")


@app.route("/")
def home():
    return {"message": "Flight Risk Prediction API is running"}


@app.route("/predict", methods=["POST"])
@limiter.limit("10 per minute")
def predict():

    # API Key authentication
    key = request.headers.get("x-api-key")

    if key != API_KEY:
        return jsonify({"error": "Unauthorized"}), 401

    data = request.json

    if not data:
        return jsonify({"error": "Invalid JSON input"}), 400

    # Required fields
    required_fields = [
        "flight_duration",
        "flight_phase",
        "departure_elevation",
        "arrival_elevation",
        "total_onboard",
        "cargo_weight",
        "airline",
        "aircraft_type",
        "aircraft_age",
        "last_maintenance_hours",
        "engine_hours_since_overhaul",
        "pilot_experience",
        "copilot_experience",
        "crew_count",
        "season",
        "weather_condition",
        "visibility_km",
        "wind_speed_knots",
        "wind_direction",
        "temperature_c",
        "precipitation_mm",
        "turbulence_severity",
        "route_complexity",
        "air_traffic_density"
    ]

    # Check missing fields
    for field in required_fields:
        if field not in data:
            return jsonify({"error": f"Missing field: {field}"}), 400

    try:

        # ----- Convert categorical text values -----

        categorical_cols = [
            "flight_phase",
            "airline",
            "aircraft_type",
            "season",
            "weather_condition",
            "turbulence_severity"
        ]

        for col in categorical_cols:
            data[col] = encoders[col].transform([data[col]])[0]

        # Convert to DataFrame
        df = pd.DataFrame([data])

        # Prediction
        prediction = model.predict(df)[0]
        probability = model.predict_proba(df)[0][1]

        logging.info("Prediction request processed")

        return jsonify({
            "risk_prediction": int(prediction),
            "risk_probability": float(probability)
        })

    except Exception as e:
        logging.error(str(e))
        return jsonify({"error": "Prediction failed"}), 500


if __name__ == "__main__":
    app.run()
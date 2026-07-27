"""Single source of truth for the model's input contract.

Both `app.py` (serving) and `train_model.py` (training) import from here so the
feature list, the categorical columns and the benign reference vector can never
drift apart.
"""

CATEGORICAL_COLS = [
    "flight_phase",
    "airline",
    "aircraft_type",
    "season",
    "weather_condition",
    "turbulence_severity",
]

NUMERIC_COLS = [
    "flight_duration",
    "departure_elevation",
    "arrival_elevation",
    "total_onboard",
    "cargo_weight",
    "aircraft_age",
    "last_maintenance_hours",
    "engine_hours_since_overhaul",
    "pilot_experience",
    "copilot_experience",
    "crew_count",
    "visibility_km",
    "wind_speed_knots",
    "wind_direction",
    "temperature_c",
    "precipitation_mm",
    "route_complexity",
    "air_traffic_density",
]

# Column order the model was trained on (generate_dataset.py order, minus `risk`).
FEATURE_ORDER = [
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
    "air_traffic_density",
]

REQUIRED_FIELDS = FEATURE_ORDER

# A "nominal flight" reference vector. Attribution works by substituting one
# feature at a time with its benign baseline and measuring how far the risk
# probability drops — so these values must describe an unremarkable, low-risk
# flight, not a dataset mean.
BENIGN_BASELINE = {
    "flight_duration": 120,
    "flight_phase": "cruise",
    "departure_elevation": 200,
    "arrival_elevation": 200,
    "total_onboard": 150,
    "cargo_weight": 8000,
    "airline": None,          # identity features are never counterfactualised
    "aircraft_type": None,
    "aircraft_age": 5,
    "last_maintenance_hours": 80,
    "engine_hours_since_overhaul": 2000,
    "pilot_experience": 9000,
    "copilot_experience": 4500,
    "crew_count": 6,
    "season": None,
    "weather_condition": "clear",
    "visibility_km": 10.0,
    "wind_speed_knots": 8,
    "wind_direction": 90,
    "temperature_c": 20,
    "precipitation_mm": 0.0,
    "turbulence_severity": "none",
    "route_complexity": 0.25,
    "air_traffic_density": 0.30,
}

# Human-readable labels used when explaining an attribution back to a dispatcher.
FEATURE_LABELS = {
    "flight_duration": "Flight duration",
    "flight_phase": "Flight phase",
    "departure_elevation": "Departure field elevation",
    "arrival_elevation": "Arrival field elevation",
    "total_onboard": "Souls on board",
    "cargo_weight": "Cargo load",
    "airline": "Operator",
    "aircraft_type": "Aircraft type",
    "aircraft_age": "Airframe age",
    "last_maintenance_hours": "Hours since last maintenance",
    "engine_hours_since_overhaul": "Engine hours since overhaul",
    "pilot_experience": "Captain experience",
    "copilot_experience": "First officer experience",
    "crew_count": "Crew complement",
    "season": "Season",
    "weather_condition": "Weather condition",
    "visibility_km": "Visibility",
    "wind_speed_knots": "Wind speed",
    "wind_direction": "Wind direction",
    "temperature_c": "Outside air temperature",
    "precipitation_mm": "Precipitation",
    "turbulence_severity": "Turbulence severity",
    "route_complexity": "Route complexity",
    "air_traffic_density": "Air traffic density",
}

# Risk bands. Kept identical to backend/config/riskPolicy.js — if you change one,
# change both.
RISK_BANDS = [
    (0.85, "critical"),
    (0.70, "high"),
    (0.55, "elevated"),
    (0.40, "advisory"),
    (0.00, "nominal"),
]


def band_for(probability):
    for floor, name in RISK_BANDS:
        if probability >= floor:
            return name
    return "nominal"

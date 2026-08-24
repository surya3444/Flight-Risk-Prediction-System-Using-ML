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
    # No benign wind direction exists without a runway heading — 090 is not
    # safer than 270. Excluded from attribution rather than given a fake
    # baseline. (This is also why the UI says "Strong winds", never
    # "Crosswind": crosswind is wind relative to the runway, and no runway
    # heading is available.)
    "wind_direction": None,
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


# ---------------------------------------------------------------------------
# Condition vocabulary
#
# A dispatcher reads "Heavy rain", not "precipitation_mm = 18". These turn a
# feature and its value into the phrase an operations person would actually
# say, plus the measurement that backs it up.
#
# Bands are ordered worst-first; the first match wins.
# ---------------------------------------------------------------------------

CONDITION_BANDS = {
    "precipitation_mm": [
        (lambda v: v >= 10, "Heavy rain"),
        (lambda v: v >= 2.5, "Moderate rain"),
        (lambda v: v > 0, "Light precipitation"),
    ],
    "visibility_km": [
        (lambda v: v < 1, "Very low visibility"),
        (lambda v: v < 3, "Low visibility"),
        (lambda v: v < 5, "Reduced visibility"),
    ],
    "wind_speed_knots": [
        (lambda v: v >= 45, "Severe winds"),
        (lambda v: v >= 30, "Strong winds"),
        (lambda v: v >= 20, "Gusty winds"),
    ],
    "weather_condition": [
        (lambda v: v == "storm", "Thunderstorm activity"),
        (lambda v: v == "snow", "Snow"),
        (lambda v: v == "rain", "Rain"),
    ],
    "turbulence_severity": [
        (lambda v: v == "severe", "Severe turbulence"),
        (lambda v: v == "moderate", "Moderate turbulence"),
        (lambda v: v == "light", "Light turbulence"),
    ],
    "flight_phase": [
        (lambda v: v in ("takeoff", "landing"), "Critical flight phase"),
        (lambda v: v == "descent", "Descent phase"),
    ],
    "aircraft_age": [
        (lambda v: v > 20, "Ageing airframe"),
        (lambda v: v > 12, "Older airframe"),
    ],
    "last_maintenance_hours": [
        (lambda v: v > 300, "Maintenance overdue"),
        (lambda v: v > 200, "High hours since maintenance"),
    ],
    "engine_hours_since_overhaul": [
        (lambda v: v > 6000, "High engine hours"),
    ],
    "pilot_experience": [
        (lambda v: v < 1500, "Low captain experience"),
        (lambda v: v < 3000, "Limited captain experience"),
    ],
    "copilot_experience": [
        (lambda v: v < 1000, "Low first officer experience"),
    ],
    "route_complexity": [
        (lambda v: v > 0.7, "Complex route"),
    ],
    "air_traffic_density": [
        (lambda v: v > 0.7, "Dense air traffic"),
    ],
    "temperature_c": [
        (lambda v: v <= -5, "Icing-risk temperatures"),
        (lambda v: v < 0, "Sub-zero temperatures"),
        (lambda v: v > 38, "Extreme heat"),
    ],
    "crew_count": [
        (lambda v: v < 5, "Minimum crew"),
    ],
    "cargo_weight": [
        (lambda v: v > 15000, "Heavy payload"),
    ],
    "flight_duration": [
        (lambda v: v > 400, "Long sector"),
    ],
    "departure_elevation": [
        (lambda v: v > 2000, "High-elevation departure field"),
    ],
    "arrival_elevation": [
        (lambda v: v > 2000, "High-elevation arrival field"),
    ],
}

# How to render the raw measurement beside the phrase.
UNITS = {
    "precipitation_mm": "{} mm/h",
    "visibility_km": "{} km",
    "wind_speed_knots": "{} kt",
    "aircraft_age": "{} years old",
    "last_maintenance_hours": "{} h since maintenance",
    "engine_hours_since_overhaul": "{} engine h",
    "pilot_experience": "{} h",
    "copilot_experience": "{} h",
    "temperature_c": "{} °C",
    "flight_duration": "{} min",
    "cargo_weight": "{} kg",
    "crew_count": "{} crew",
    "departure_elevation": "{} ft",
    "arrival_elevation": "{} ft",
    "route_complexity": "complexity {}",
    "air_traffic_density": "density {}",
}


def describe_condition(feature, value):
    """Returns (phrase, measurement) for one feature at one value.

    Falls back to the plain feature name when the value is unremarkable — a
    factor can still carry weight without deserving a dramatic label.
    """
    phrase = None
    for test, label in CONDITION_BANDS.get(feature, []):
        try:
            if test(value):
                phrase = label
                break
        except TypeError:
            continue

    if phrase is None:
        phrase = FEATURE_LABELS.get(feature, feature)

    template = UNITS.get(feature)
    if template:
        measurement = template.format(value)
    elif isinstance(value, str):
        measurement = value.replace("_", " ")
    else:
        measurement = str(value)

    return phrase, measurement

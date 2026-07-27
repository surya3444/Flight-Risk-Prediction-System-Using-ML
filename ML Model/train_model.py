import joblib
import pandas as pd

import matplotlib
matplotlib.use("Agg")  # headless: training runs on servers and in CI, not on a desktop
import matplotlib.pyplot as plt

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, roc_auc_score

from risk_schema import CATEGORICAL_COLS, FEATURE_ORDER

# Load dataset
data = pd.read_csv("flight_data.csv")

# ----- Encode categorical columns -----

encoders = {}

for col in CATEGORICAL_COLS:
    encoder = LabelEncoder()
    data[col] = encoder.fit_transform(data[col])
    encoders[col] = encoder

# ----- Features and target -----
# Column order is pinned by risk_schema so the serving path can build a frame
# in exactly the order the model was fitted on.

X = data[FEATURE_ORDER]
y = data["risk"]

# ----- Train/Test Split -----

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42,
    stratify=y
)

# ----- Train Model -----

model = RandomForestClassifier(
    n_estimators=150,
    max_depth=None,
    random_state=42
)

model.fit(X_train, y_train)

# ----- Evaluate Model -----

predictions = model.predict(X_test)
probabilities = model.predict_proba(X_test)[:, 1]

print("Model Accuracy:", accuracy_score(y_test, predictions))
print("ROC AUC:", roc_auc_score(y_test, probabilities))
print()
print(classification_report(y_test, predictions, target_names=["nominal", "at risk"]))

# ----- Save Model & Encoders -----

joblib.dump(model, "flight_risk_model.pkl")
print("Model saved successfully!")

joblib.dump(encoders, "encoders.pkl")
print("Encoders saved successfully!")

# ----- Example Prediction -----

sample = pd.DataFrame([{
    "flight_duration": 220,
    "flight_phase": encoders["flight_phase"].transform(["cruise"])[0],
    "departure_elevation": 500,
    "arrival_elevation": 100,
    "total_onboard": 180,
    "cargo_weight": 12000,
    "airline": encoders["airline"].transform(["Delta"])[0],
    "aircraft_type": encoders["aircraft_type"].transform(["A320"])[0],
    "aircraft_age": 12,
    "last_maintenance_hours": 200,
    "engine_hours_since_overhaul": 4000,
    "pilot_experience": 5000,
    "copilot_experience": 2000,
    "crew_count": 6,
    "season": encoders["season"].transform(["winter"])[0],
    "weather_condition": encoders["weather_condition"].transform(["storm"])[0],
    "visibility_km": 3,
    "wind_speed_knots": 40,
    "wind_direction": 180,
    "temperature_c": -2,
    "precipitation_mm": 10,
    "turbulence_severity": encoders["turbulence_severity"].transform(["moderate"])[0],
    "route_complexity": 0.7,
    "air_traffic_density": 0.8
}])[FEATURE_ORDER]

print("Prediction for sample flight:", model.predict(sample))

# ----- Feature Importance -----

importances = pd.Series(model.feature_importances_, index=FEATURE_ORDER).sort_values()

plt.figure(figsize=(10, 8))
plt.barh(importances.index, importances.values)
plt.xlabel("Importance")
plt.title("Feature Importance for Flight Risk")
plt.tight_layout()
plt.savefig("feature_importance.png", dpi=140)
print("Feature importance chart written to feature_importance.png")

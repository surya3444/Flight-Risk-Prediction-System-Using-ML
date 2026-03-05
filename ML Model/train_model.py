import pandas as pd
import numpy as np
import joblib
import matplotlib.pyplot as plt

from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score

# Load dataset
data = pd.read_csv("flight_data.csv")

# ----- Encode categorical columns -----

categorical_cols = [
    "flight_phase",
    "airline",
    "aircraft_type",
    "season",
    "weather_condition",
    "turbulence_severity"
]

encoders = {}

for col in categorical_cols:
    encoder = LabelEncoder()
    data[col] = encoder.fit_transform(data[col])
    encoders[col] = encoder

# ----- Features and target -----

X = data.drop("risk", axis=1)
y = data["risk"]

# ----- Train/Test Split -----

X_train, X_test, y_train, y_test = train_test_split(
    X,
    y,
    test_size=0.2,
    random_state=42
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

accuracy = accuracy_score(y_test, predictions)

print("Model Accuracy:", accuracy)

# ----- Save Model -----

joblib.dump(model, "flight_risk_model.pkl")

print("Model saved successfully!")

# ----- Save Encoders (NEW) -----

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
}])

prediction = model.predict(sample)

print("Prediction for sample flight:", prediction)

# ----- Feature Importance -----

importances = model.feature_importances_
features = X.columns

plt.figure(figsize=(10,8))
plt.barh(features, importances)

plt.xlabel("Importance")
plt.title("Feature Importance for Flight Risk")

plt.tight_layout()
plt.show()
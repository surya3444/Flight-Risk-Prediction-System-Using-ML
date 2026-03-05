import joblib
import pandas as pd
from flask import Flask, request, jsonify

app = Flask(__name__)

# Load trained model
model = joblib.load("flight_risk_model.pkl")

@app.route("/")
def home():
    return {"message": "Flight Risk Prediction API is running"}

@app.route("/predict", methods=["POST"])
def predict():

    data = request.json

    df = pd.DataFrame([data])

    prediction = model.predict(df)[0]
    probability = model.predict_proba(df)[0][1]

    return jsonify({
        "risk_prediction": int(prediction),
        "risk_probability": float(probability)
    })

if __name__ == "__main__":
    app.run(debug=True)
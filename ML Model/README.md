# Flight Risk Prediction API

Machine Learning API that predicts flight risk using a Random Forest model.

## Setup Instructions

### 1. Clone repository or download ZIP

Download and extract the project.

### 2. Create virtual environment

python3 -m venv venv

### 3. Activate environment

Mac/Linux:

source venv/bin/activate

Windows:

venv\Scripts\activate

### 4. Install dependencies

pip install -r requirements.txt

### 5. Run the server

python app.py

Server will start at:

http://127.0.0.1:5000

### 6. Test API

POST request to:

http://127.0.0.1:5000/predict




############################################

## Flight Risk Prediction API Documentation

Overview

The Flight Risk Prediction API is a RESTful service that uses a Random Forest machine learning model to predict the risk level of a flight based on multiple parameters including flight details, aircraft condition, pilot experience, weather, and traffic conditions.

The API returns:
Risk Prediction (Safe or Risky)
Risk Probability

Base URL
http://127.0.0.1:5000


Health Check Endpoint
GET /
Used to verify that the API service is running.

Request:
GET /

Response:
{
  "message": "Flight Risk Prediction API is running"
}


Flight Risk Prediction
POST /predict

This endpoint predicts the risk level of a flight based on input parameters.

Request Headers
Content-Type: application/json

Request Body

Example JSON request:

{
 "flight_duration": 220,
 "flight_phase": 2,
 "departure_elevation": 500,
 "arrival_elevation": 100,
 "total_onboard": 180,
 "cargo_weight": 12000,
 "airline": 1,
 "aircraft_type": 0,
 "aircraft_age": 12,
 "last_maintenance_hours": 200,
 "engine_hours_since_overhaul": 4000,
 "pilot_experience": 5000,
 "copilot_experience": 2000,
 "crew_count": 6,
 "season": 3,
 "weather_condition": 2,
 "visibility_km": 3,
 "wind_speed_knots": 40,
 "wind_direction": 180,
 "temperature_c": -2,
 "precipitation_mm": 10,
 "turbulence_severity": 2,
 "route_complexity": 0.7,
 "air_traffic_density": 0.8
}


Example curl Request:

curl -X POST http://127.0.0.1:5000/predict \
-H "Content-Type: application/json" \
-d '{ "flight_duration":220,"flight_phase":2,"departure_elevation":500,"arrival_elevation":100,"total_onboard":180,"cargo_weight":12000,"airline":1,"aircraft_type":0,"aircraft_age":12,"last_maintenance_hours":200,"engine_hours_since_overhaul":4000,"pilot_experience":5000,"copilot_experience":2000,"crew_count":6,"season":3,"weather_condition":2,"visibility_km":3,"wind_speed_knots":40,"wind_direction":180,"temperature_c":-2,"precipitation_mm":10,"turbulence_severity":2,"route_complexity":0.7,"air_traffic_density":0.8 }'


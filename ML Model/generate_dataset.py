import pandas as pd
import random

rows = []

flight_phases = ["takeoff", "climb", "cruise", "descent", "landing"]
airlines = ["Delta", "United", "Emirates", "Lufthansa", "Indigo"]
aircraft_types = ["A320", "B737", "B787", "A350"]
seasons = ["spring", "summer", "autumn", "winter"]
weather_conditions = ["clear", "rain", "storm", "snow"]
turbulence_levels = ["none", "light", "moderate", "severe"]

for i in range(10000):

    flight_duration = random.randint(60, 600)
    flight_phase = random.choice(flight_phases)

    dep_elevation = random.randint(0, 3000)
    arr_elevation = random.randint(0, 3000)

    total_onboard = random.randint(50, 300)
    cargo_weight = random.randint(1000, 20000)

    airline = random.choice(airlines)
    aircraft_type = random.choice(aircraft_types)

    aircraft_age = random.randint(1, 30)
    last_maintenance_hours = random.randint(10, 500)
    engine_hours = random.randint(500, 10000)

    pilot_exp = random.randint(500, 15000)
    copilot_exp = random.randint(200, 8000)
    crew_count = random.randint(4, 10)

    season = random.choice(seasons)
    weather = random.choice(weather_conditions)

    visibility = random.uniform(1, 15)
    wind_speed = random.randint(0, 60)
    wind_direction = random.randint(0, 360)

    temperature = random.randint(-20, 40)
    precipitation = random.uniform(0, 20)

    turbulence = random.choice(turbulence_levels)

    route_complexity = round(random.uniform(0, 1), 2)
    traffic_density = round(random.uniform(0, 1), 2)

    # ----- Risk Logic -----

    risk = 0

    if wind_speed > 45:
        risk = 1

    if visibility < 3 and weather in ["storm", "snow"]:
        risk = 1

    if turbulence == "severe":
        risk = 1

    if aircraft_age > 20 and last_maintenance_hours > 300:
        risk = 1

    if pilot_exp < 1500 and route_complexity > 0.7:
        risk = 1

    if random.random() < 0.05:
        risk = 1 - risk

    rows.append([
        flight_duration,
        flight_phase,
        dep_elevation,
        arr_elevation,
        total_onboard,
        cargo_weight,
        airline,
        aircraft_type,
        aircraft_age,
        last_maintenance_hours,
        engine_hours,
        pilot_exp,
        copilot_exp,
        crew_count,
        season,
        weather,
        visibility,
        wind_speed,
        wind_direction,
        temperature,
        precipitation,
        turbulence,
        route_complexity,
        traffic_density,
        risk
    ])

columns = [
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
    "risk"
]

df = pd.DataFrame(rows, columns=columns)

df.to_csv("flight_data.csv", index=False)

print("Advanced dataset with", len(df), "rows created!")
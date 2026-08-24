"""Operational mitigations, scored by the model rather than asserted.

The rule this file exists to enforce: **never recommend an action without
measuring it.** Each entry below describes a real thing an operations centre can
do, expressed as a concrete change to the flight vector. The engine applies the
change, re-scores the flight, and reports the risk that actually results. An
action that turns out not to help is dropped rather than shown — which is the
point, because "reduce payload" is worthless advice on a flight whose risk is
entirely weather.

Two fields keep the advice grounded in reality:

* ``phases`` — when the action is still available. You cannot offload cargo from
  an aircraft in the cruise, and recommending it would discredit the panel.
* ``disruption`` — what it costs the operation. Used to break ties, so the
  cheaper of two equally effective actions is offered first.
"""

PRE_DEPARTURE = ("takeoff",)
EARLY = ("takeoff", "climb")
AIRBORNE = ("climb", "cruise", "descent", "landing")
ARRIVAL = ("cruise", "descent", "landing")
ALL_PHASES = ("takeoff", "climb", "cruise", "descent", "landing")


def _pct_of(before, after):
    if not before:
        return 0
    return round((before - after) / before * 100)


MITIGATIONS = [
    # ── Load and balance ────────────────────────────────────────────────────
    {
        "id": "REDUCE_PAYLOAD",
        "label": "Reduce payload",
        "category": "Load",
        "phases": PRE_DEPARTURE,
        "disruption": 2,
        "applies": lambda d: d["cargo_weight"] > 5000,
        "apply": lambda d: {"cargo_weight": max(int(d["cargo_weight"] * 0.7), 1000)},
        "describe": lambda d, n: (
            f"Offload ~{d['cargo_weight'] - n['cargo_weight']:,} kg "
            f"({_pct_of(d['cargo_weight'], n['cargo_weight'])}% of cargo) before release."
        ),
    },
    # ── Crew ────────────────────────────────────────────────────────────────
    {
        "id": "ASSIGN_SENIOR_CAPTAIN",
        "label": "Assign experienced captain",
        "category": "Crew",
        "phases": PRE_DEPARTURE,
        "disruption": 3,
        "applies": lambda d: d["pilot_experience"] < 8000,
        "apply": lambda d: {"pilot_experience": 12000},
        "describe": lambda d, n: (
            f"Roster a captain above 12,000 h in place of the current "
            f"{d['pilot_experience']:,} h commander."
        ),
    },
    {
        "id": "ASSIGN_SENIOR_FO",
        "label": "Assign experienced first officer",
        "category": "Crew",
        "phases": PRE_DEPARTURE,
        "disruption": 3,
        "applies": lambda d: d["copilot_experience"] < 4000,
        "apply": lambda d: {"copilot_experience": 6500},
        "describe": lambda d, n: (
            f"Pair the commander with a first officer above 6,500 h "
            f"(currently {d['copilot_experience']:,} h)."
        ),
    },
    {
        "id": "AUGMENT_CREW",
        "label": "Augment cabin crew",
        "category": "Crew",
        "phases": PRE_DEPARTURE,
        "disruption": 1,
        "applies": lambda d: d["crew_count"] < 8,
        "apply": lambda d: {"crew_count": d["crew_count"] + 2},
        "describe": lambda d, n: f"Carry {n['crew_count']} crew instead of {d['crew_count']}.",
    },
    # ── Engineering ─────────────────────────────────────────────────────────
    {
        "id": "LINE_MAINTENANCE_CHECK",
        "label": "Pull for a line check",
        "category": "Engineering",
        "phases": PRE_DEPARTURE,
        "disruption": 4,
        "applies": lambda d: d["last_maintenance_hours"] > 150,
        "apply": lambda d: {"last_maintenance_hours": 20},
        "describe": lambda d, n: (
            f"Airframe is {d['last_maintenance_hours']} h since last maintenance — "
            f"schedule a line check before release."
        ),
    },
    {
        "id": "SUBSTITUTE_AIRFRAME",
        "label": "Substitute a younger airframe",
        "category": "Engineering",
        "phases": PRE_DEPARTURE,
        "disruption": 5,
        "applies": lambda d: d["aircraft_age"] > 15 or d["engine_hours_since_overhaul"] > 6000,
        "apply": lambda d: {
            "aircraft_age": 5,
            "last_maintenance_hours": 40,
            "engine_hours_since_overhaul": 1500,
        },
        "describe": lambda d, n: (
            f"Swap the {d['aircraft_age']}-year airframe for a low-hours aircraft from the fleet."
        ),
    },
    # ── Routing and slots ───────────────────────────────────────────────────
    {
        "id": "SIMPLIFY_ROUTING",
        "label": "File a simpler routing",
        "category": "Routing",
        "phases": EARLY,
        "disruption": 2,
        "applies": lambda d: d["route_complexity"] > 0.4,
        "apply": lambda d: {"route_complexity": 0.2},
        "describe": lambda d, n: (
            f"Re-file at lower route complexity ({d['route_complexity']} → 0.2) "
            f"to reduce workload."
        ),
    },
    {
        "id": "OFF_PEAK_SLOT",
        "label": "Move to a quieter slot",
        "category": "Routing",
        "phases": PRE_DEPARTURE,
        "disruption": 3,
        "applies": lambda d: d["air_traffic_density"] > 0.5,
        "apply": lambda d: {"air_traffic_density": 0.2},
        "describe": lambda d, n: (
            f"Traffic density is {d['air_traffic_density']} — request a slot outside the peak."
        ),
    },
    # ── Weather holds. Conditional by nature: the number is the risk *if* the
    #    stated condition is met, never a promise that it will be. ───────────
    {
        "id": "HOLD_FOR_VISIBILITY",
        "label": "Hold for visibility",
        "category": "Weather",
        "phases": ALL_PHASES,
        "disruption": 4,
        "applies": lambda d: d["visibility_km"] < 5,
        "apply": lambda d: {"visibility_km": 8.0},
        "describe": lambda d, n: (
            f"Visibility is {d['visibility_km']} km — hold until it exceeds 8 km."
        ),
    },
    {
        "id": "HOLD_FOR_WIND",
        "label": "Hold for winds to ease",
        "category": "Weather",
        "phases": ALL_PHASES,
        "disruption": 4,
        "applies": lambda d: d["wind_speed_knots"] > 25,
        "apply": lambda d: {"wind_speed_knots": 15},
        "describe": lambda d, n: (
            f"Surface wind is {d['wind_speed_knots']} kt — hold until it drops below 15 kt."
        ),
    },
    {
        "id": "HOLD_FOR_CONVECTION",
        "label": "Hold for convective activity to clear",
        "category": "Weather",
        "phases": ALL_PHASES,
        "disruption": 5,
        "applies": lambda d: d["weather_condition"] in ("storm", "snow")
        or d["turbulence_severity"] == "severe",
        "apply": lambda d: {
            "weather_condition": "rain" if d["weather_condition"] == "storm" else "clear",
            "turbulence_severity": "light",
            "precipitation_mm": min(d["precipitation_mm"], 2.0),
        },
        "describe": lambda d, n: (
            f"{d['weather_condition'].title()} with {d['turbulence_severity']} turbulence — "
            f"hold until the cell clears the field."
        ),
    },
    {
        "id": "DIVERT_TO_ALTERNATE",
        "label": "Divert to alternate",
        "category": "Weather",
        "phases": ARRIVAL,
        "disruption": 5,
        "applies": lambda d: (
            d["weather_condition"] in ("storm", "snow")
            or d["visibility_km"] < 3
            or d["wind_speed_knots"] > 40
        ),
        "apply": lambda d: {
            "weather_condition": "clear",
            "visibility_km": 10.0,
            "wind_speed_knots": 12,
            "precipitation_mm": 0.0,
            "turbulence_severity": "none",
        },
        "describe": lambda d, n: (
            "Destination conditions are the dominant factor — evaluate an alternate "
            "with better weather."
        ),
    },
]


def available(flight_data):
    """Mitigations that are both applicable to this flight and still in time."""
    phase = flight_data.get("flight_phase", "takeoff")
    out = []
    for m in MITIGATIONS:
        if phase not in m["phases"]:
            continue
        try:
            if m["applies"](flight_data):
                out.append(m)
        except (KeyError, TypeError):
            continue
    return out

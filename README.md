# AeroSafe — Flight Risk Decision Support

ATC, TCAS, GPWS, weather radar and ADS-B already keep aircraft safe in the air.
AeroSafe does not compete with any of them. It sits one layer above, in the
**airline's Operations Control Centre**, and answers a question those systems do
not: *across the flights we are running right now, which one is quietly becoming
the problem, and who in this building needs to know?*

Two things make it that rather than a prediction demo:

1. **Escalation** — a risk score that crosses policy is routed to the dispatcher,
   the duty manager and the OCC feed, with an incident opened and an audit trail
   kept. Nothing is ever sent to the flight deck.
2. **Continuous monitoring** — flights are re-scored on a cadence against fresh
   weather, so a sector that departed nominal and flew into a developing storm is
   caught while there is still time to act.

---

## Architecture

```
React (Vite)  ──►  Express + MongoDB  ──►  Flask + RandomForest
  Ops Centre        escalation engine        risk model + attribution
  Incidents         monitoring scheduler
  Alert routing     notification fan-out
                          │
                          ├──► Gmail SMTP  (dispatcher / duty manager email)
                          ├──► Twilio      (duty manager SMS, emergency only)
                          ├──► OCC webhook (JSON push to an existing dashboard)
                          └──► OpenWeather (live conditions, server-side)
```

### Why the escalation engine is its own layer

Severity is **not** a function of the probability alone. It is derived from how
many of three primary conditions coincide:

| Primary conditions met | Severity | Who is notified |
|---|---|---|
| 3 — high risk **and** critical phase **and** adverse weather | `emergency` | Dispatcher + duty manager email + **SMS page** + OCC feed |
| 2 | `alert` | Dispatcher + duty manager email + OCC feed |
| 1 | `advisory` | Dispatcher email |
| 0, but context rules fired | `watch` | Board only — nobody is paged |

A secondary rule (risk trending sharply upward, sustained high risk, low
visibility on approach) raises the tier by one, but never creates an emergency on
its own. Anything the model puts in the critical band is at minimum an `alert`.

So 75% risk in cruise on a clear day is an advisory; the same 75% on approach into
a snowstorm pages a human. That distinction is the whole point of the layer.

The full catalogue lives in [`backend/config/riskPolicy.js`](backend/config/riskPolicy.js)
and is served to the UI at `GET /api/monitor/policy`, so the interface can never
show thresholds different from the ones being enforced.

### Why the model explains itself

`/predict` returns `contributing_factors`: **leave-one-out counterfactual
attribution**. Each factor is re-scored with that single input set to a benign
baseline, and the drop in probability is its contribution. This is per-flight,
not global feature importance — two flights sharing a top-importance feature get
different reasons. A dispatcher who cannot see *why* will not trust the number,
and a number nobody trusts changes no decisions.

---

## Running it

Three processes. Start the model first.

```bash
# 1. Risk model
cd "ML Model"
pip install -r requirements.txt
python app.py                     # :5000

# 2. API + monitoring scheduler
cd backend
cp .env.example .env              # fill in MONGO_URI, JWT_SECRET, OPENWEATHER_API_KEY
npm install && npm run dev        # :8000

# 3. Interface
cd frontend
npm install && npm run dev        # :5173
```

`GET /api/health` reports database, scheduler and model status in one call.

### Configuration that actually matters

- **`OPENWEATHER_API_KEY` (backend)** — required. The scheduler fetches weather
  server-side; without it, monitored flights fall back to their last known
  conditions and every snapshot is flagged `stale` in the UI.
- **`GMAIL_USER` / `GMAIL_APP_PASSWORD`** — email goes out over Gmail's SMTP
  relay (`smtp.gmail.com:587`, STARTTLS). `GMAIL_APP_PASSWORD` is a
  **16-character App Password** from
  [myaccount.google.com/apppasswords](https://myaccount.google.com/apppasswords),
  **not** the account password — Google stopped accepting those for SMTP in May
  2022, and 2-Step Verification has to be on before the page will issue one.
  Without these the email channel reports `failed` and is logged as such; the
  monitor keeps running. Alert routing has a **Test mail connection** button
  that authenticates without sending, so a bad password is caught without
  spending a send.

  Sending from a real Gmail mailbox is deliberate while there is no owned
  domain: the mail is already SPF/DKIM-aligned by Google, so it does not land in
  spam the way mail from an unauthenticated custom domain does. The trade-off is
  the free quota — roughly **500 recipients per day**.
- **`TWILIO_*`** — optional. Unset means the SMS channel reports `skipped`.

No missing credential takes the server down: a channel that cannot deliver is
recorded as a failure on the incident, which is more useful than a silent gap.

---

## The screens

| Route | What it is for |
|---|---|
| `/` | **Ops Centre** — live board: monitored flights by risk, active incidents, scheduler and model health |
| `/assess` | Score one flight; see the factors, the rules it tripped, and hand it to monitoring |
| `/flights/:id` | One flight over time — risk trend, conditions used, incidents raised |
| `/incidents` | Incident log with acknowledge / resolve and the full notification trail, failures included |
| `/settings` | Alert routing, thresholds, escalation readiness, and a drill button |
| `/history` | Manual assessment log |

The Ops Centre shows scheduler and model health next to the flights on purpose: a
monitoring tool that has silently stopped monitoring is more dangerous than no
tool at all.

---

## API

| Method | Route | Purpose |
|---|---|---|
| `POST` | `/api/predict` | One-shot assessment; escalates if policy says so |
| `GET` | `/api/predict/history` | Manual assessment log |
| `POST` | `/api/monitor` | Put a flight under continuous monitoring |
| `GET` | `/api/monitor` | List monitored flights |
| `GET` | `/api/monitor/:id` | Flight detail + risk snapshots + incidents |
| `PATCH` | `/api/monitor/:id` | Pause, resume, or retune the interval |
| `POST` | `/api/monitor/:id/check` | Force an immediate re-evaluation |
| `DELETE` | `/api/monitor/:id` | Stop monitoring (incidents are retained) |
| `GET` | `/api/monitor/ops/summary` | Everything the Ops Centre board needs in one poll |
| `GET` | `/api/monitor/policy` | The live escalation rule catalogue |
| `GET` | `/api/incidents` | Incident log |
| `POST` | `/api/incidents/:id/acknowledge` | A human has it |
| `POST` | `/api/incidents/:id/resolve` | Close out with a written outcome |
| `POST` | `/api/incidents/:id/renotify` | Re-send after a channel failure |
| `GET`/`PUT` | `/api/settings/alerts` | Alert routing |
| `POST` | `/api/settings/alerts/test` | Fire a labelled drill down every channel |
| `POST` | `/api/settings/alerts/verify-smtp` | Authenticate against Gmail without sending |

Model service: `GET /health`, `POST /predict`, `POST /predict/batch` (up to 50
flights, per-entry success so one bad flight cannot fail a monitoring cycle).

---

## Known limits — state these before an examiner asks

- **Flight phase is modelled from the clock**, not from ADS-B: scheduled
  departure plus block time against a standard sector profile. Sufficient to know
  which phase a risk applies to; not a position source.
- **Turbulence is inferred** from surface wind, gusts and convective activity.
  OpenWeather does not report turbulence. The UI labels it as an estimate
  wherever it appears.
- **The model is trained on a synthetic dataset** (`generate_dataset.py`) with
  deliberately injected label noise. The pipeline is real; the ground truth is
  not operational data.
- **Escalation is advisory.** It does not replace ATC, dispatch release or
  commander authority, and it never contacts the flight deck.

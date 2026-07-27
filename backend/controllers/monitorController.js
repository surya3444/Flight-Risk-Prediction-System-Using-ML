const mongoose = require('mongoose');

const MonitoredFlight = require('../models/MonitoredFlight');
const RiskSnapshot = require('../models/RiskSnapshot');
const Incident = require('../models/Incident');
const monitorScheduler = require('../services/monitorScheduler');
const escalationEngine = require('../services/escalationEngine');
const mlClient = require('../services/mlClient');
const { derivePhase } = require('../utils/flightPhase');
const {
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  DEFAULT_INTERVAL_MINUTES,
  RULES,
  THRESHOLDS,
  ROUTING,
  RISK_BANDS,
  SEVERITY_ORDER,
} = require('../config/riskPolicy');

// The flight facts the operator supplies once; weather and phase are refreshed
// automatically on every cycle and must not be accepted from the client.
const BASELINE_FIELDS = [
  'flight_duration',
  'departure_elevation',
  'arrival_elevation',
  'total_onboard',
  'cargo_weight',
  'airline',
  'aircraft_type',
  'aircraft_age',
  'last_maintenance_hours',
  'engine_hours_since_overhaul',
  'pilot_experience',
  'copilot_experience',
  'crew_count',
  'route_complexity',
  'air_traffic_density',
];

// Placeholders overwritten on the first cycle. They exist only so the payload
// is complete if the very first weather lookup fails.
const WEATHER_DEFAULTS = {
  flight_phase: 'takeoff',
  season: 'summer',
  weather_condition: 'clear',
  visibility_km: 10,
  wind_speed_knots: 5,
  wind_direction: 90,
  temperature_c: 20,
  precipitation_mm: 0,
  turbulence_severity: 'none',
};

function buildBaseline(body) {
  const baseline = { ...WEATHER_DEFAULTS };
  const missing = [];

  for (const field of BASELINE_FIELDS) {
    const value = body[field];
    if (value === undefined || value === null || value === '') {
      missing.push(field);
      continue;
    }
    baseline[field] = typeof value === 'string' && !Number.isNaN(Number(value)) ? Number(value) : value;
  }

  return { baseline, missing };
}

/** POST /api/monitor — put a flight under continuous monitoring. */
exports.createMonitoredFlight = async (req, res) => {
  try {
    const { flightNumber, departureCity, arrivalCity, scheduledDeparture, intervalMinutes } = req.body;

    if (!flightNumber || !departureCity || !arrivalCity) {
      return res.status(400).json({
        success: false,
        error: 'flightNumber, departureCity and arrivalCity are required',
      });
    }

    const departure = scheduledDeparture ? new Date(scheduledDeparture) : new Date();
    if (Number.isNaN(departure.getTime())) {
      return res.status(400).json({ success: false, error: 'scheduledDeparture is not a valid date' });
    }

    const { baseline, missing } = buildBaseline(req.body);
    if (missing.length) {
      return res.status(400).json({
        success: false,
        error: `Missing flight parameters: ${missing.join(', ')}`,
      });
    }

    const settings = await escalationEngine.settingsFor(req.user.id);
    const interval = Math.min(
      Math.max(Number(intervalMinutes) || settings.defaultIntervalMinutes || DEFAULT_INTERVAL_MINUTES, MIN_INTERVAL_MINUTES),
      MAX_INTERVAL_MINUTES
    );

    const flight = await MonitoredFlight.create({
      user: req.user.id,
      flightNumber,
      departureCity,
      arrivalCity,
      scheduledDeparture: departure,
      blockMinutes: baseline.flight_duration,
      baselineData: baseline,
      intervalMinutes: interval,
      status: 'scheduled',
      // Score immediately so the dispatcher sees a number rather than an empty
      // card while waiting for the first tick.
      nextCheckAt: new Date(),
    });

    let firstCheck = null;
    try {
      firstCheck = await monitorScheduler.checkFlight(flight, { settings });
    } catch (error) {
      console.warn(`[monitor] initial check failed for ${flight.flightNumber}: ${error.message}`);
      flight.lastError = error.message;
      await flight.save();
    }

    res.status(201).json({
      success: true,
      data: flight,
      firstCheck: firstCheck
        ? {
            probability: firstCheck.snapshot.riskProbability,
            band: firstCheck.snapshot.riskBand,
            severity: firstCheck.evaluation.severity,
            incident: firstCheck.escalation?.incident?.reference || null,
          }
        : null,
    });
  } catch (error) {
    console.error('Create monitored flight failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not start monitoring for this flight.' });
  }
};

/** GET /api/monitor — every flight this operator is tracking. */
exports.listMonitoredFlights = async (req, res) => {
  try {
    const filter = { user: req.user.id };
    if (req.query.status) filter.status = req.query.status;

    const flights = await MonitoredFlight.find(filter).sort({ createdAt: -1 }).limit(200);

    const openIncidents = await Incident.aggregate([
      {
        $match: {
          user: new mongoose.Types.ObjectId(req.user.id),
          status: { $in: ['open', 'acknowledged'] },
          flight: { $ne: null },
        },
      },
      { $group: { _id: '$flight', count: { $sum: 1 } } },
    ]);
    const incidentCounts = new Map(openIncidents.map((i) => [String(i._id), i.count]));

    res.json({
      success: true,
      count: flights.length,
      data: flights.map((f) => ({
        ...f.toJSON(),
        openIncidents: incidentCounts.get(String(f._id)) || 0,
      })),
    });
  } catch (error) {
    console.error('List monitored flights failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not load monitored flights.' });
  }
};

/** GET /api/monitor/:id — one flight, its risk trend and its incidents. */
exports.getMonitoredFlight = async (req, res) => {
  try {
    const flight = await MonitoredFlight.findOne({ _id: req.params.id, user: req.user.id });
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    const limit = Math.min(Number(req.query.limit) || 120, 500);

    const [snapshots, incidents] = await Promise.all([
      RiskSnapshot.find({ flight: flight._id }).sort({ createdAt: -1 }).limit(limit),
      Incident.find({ flight: flight._id }).sort({ createdAt: -1 }).limit(50),
    ]);

    res.json({
      success: true,
      data: {
        flight: flight.toJSON(),
        // Oldest → newest, which is the order the trend chart plots.
        snapshots: snapshots.reverse(),
        incidents,
        projectedPhase: derivePhase(flight.scheduledDeparture, flight.blockMinutes),
      },
    });
  } catch (error) {
    console.error('Get monitored flight failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not load this flight.' });
  }
};

/** POST /api/monitor/:id/check — force an immediate re-evaluation. */
exports.checkNow = async (req, res) => {
  try {
    const flight = await MonitoredFlight.findOne({ _id: req.params.id, user: req.user.id });
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    if (flight.status === 'completed') {
      return res.status(409).json({ success: false, error: 'This flight has already arrived.' });
    }

    const result = await monitorScheduler.checkFlight(flight);

    res.json({
      success: true,
      data: {
        flight: flight.toJSON(),
        snapshot: result.snapshot,
        severity: result.evaluation.severity,
        triggeredRules: result.evaluation.triggeredRules,
        incident: result.escalation?.incident || null,
        weatherSource: result.weatherSource,
      },
    });
  } catch (error) {
    console.error('Forced check failed:', error.message);
    res.status(502).json({ success: false, error: error.message });
  }
};

/** PATCH /api/monitor/:id — pause, resume or retune a monitor. */
exports.updateMonitoredFlight = async (req, res) => {
  try {
    const flight = await MonitoredFlight.findOne({ _id: req.params.id, user: req.user.id });
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    const { status, intervalMinutes } = req.body;

    if (status) {
      if (!['active', 'stopped', 'completed'].includes(status)) {
        return res.status(400).json({ success: false, error: 'status must be active, stopped or completed' });
      }
      flight.status = status;
      if (status === 'active') {
        flight.nextCheckAt = new Date();
        flight.consecutiveFailures = 0;
        flight.lastError = null;
      }
    }

    if (intervalMinutes !== undefined) {
      flight.intervalMinutes = Math.min(
        Math.max(Number(intervalMinutes), MIN_INTERVAL_MINUTES),
        MAX_INTERVAL_MINUTES
      );
    }

    await flight.save();
    res.json({ success: true, data: flight });
  } catch (error) {
    console.error('Update monitored flight failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not update this monitor.' });
  }
};

/** DELETE /api/monitor/:id — remove the flight and its trail. */
exports.deleteMonitoredFlight = async (req, res) => {
  try {
    const flight = await MonitoredFlight.findOneAndDelete({ _id: req.params.id, user: req.user.id });
    if (!flight) return res.status(404).json({ success: false, error: 'Flight not found' });

    // Snapshots are noise once the flight is gone; incidents are the audit
    // trail and are deliberately kept, just detached.
    await RiskSnapshot.deleteMany({ flight: flight._id });
    await Incident.updateMany({ flight: flight._id }, { $set: { flight: null } });

    res.json({ success: true, data: { id: flight._id } });
  } catch (error) {
    console.error('Delete monitored flight failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not remove this monitor.' });
  }
};

/**
 * GET /api/monitor/ops/summary — everything the Operations Centre board needs
 * in one poll: live flights, open incidents, scheduler health.
 */
exports.opsSummary = async (req, res) => {
  try {
    const userId = req.user.id;

    const [flights, incidents, mlHealth] = await Promise.all([
      MonitoredFlight.find({ user: userId, status: { $in: ['scheduled', 'active'] } })
        .sort({ latestProbability: -1 })
        .limit(100),
      Incident.find({ user: userId, status: { $in: ['open', 'acknowledged'] } })
        .sort({ lastTriggeredAt: -1 })
        .limit(50),
      mlClient.health(),
    ]);

    const bySeverity = incidents.reduce((acc, i) => {
      acc[i.severity] = (acc[i.severity] || 0) + 1;
      return acc;
    }, {});

    const atRisk = flights.filter((f) => (f.latestProbability || 0) >= THRESHOLDS.highRisk).length;

    res.json({
      success: true,
      data: {
        flights,
        incidents,
        counters: {
          monitored: flights.length,
          atRisk,
          openIncidents: incidents.filter((i) => i.status === 'open').length,
          acknowledged: incidents.filter((i) => i.status === 'acknowledged').length,
          bySeverity,
        },
        scheduler: monitorScheduler.getStats(),
        mlService: mlHealth,
        generatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('Ops summary failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not build the operations summary.' });
  }
};

/**
 * GET /api/monitor/policy — the live rule catalogue.
 *
 * The UI renders escalation rules and thresholds from this rather than
 * hard-coding its own copy, so the two can never disagree.
 */
exports.getPolicy = (req, res) => {
  res.json({
    success: true,
    data: {
      thresholds: THRESHOLDS,
      bands: RISK_BANDS,
      severities: SEVERITY_ORDER,
      routing: ROUTING,
      rules: RULES.map(({ code, kind, label, bumps }) => ({ code, kind, label, bumps: Boolean(bumps) })),
      interval: {
        default: DEFAULT_INTERVAL_MINUTES,
        min: MIN_INTERVAL_MINUTES,
        max: MAX_INTERVAL_MINUTES,
      },
    },
  });
};

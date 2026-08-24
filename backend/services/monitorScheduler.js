const MonitoredFlight = require('../models/MonitoredFlight');
const RiskSnapshot = require('../models/RiskSnapshot');
const weatherService = require('./weatherService');
const mlClient = require('./mlClient');
const escalationEngine = require('./escalationEngine');
const { derivePhase, relevantField } = require('../utils/flightPhase');
const { severityRank } = require('../config/riskPolicy');

/**
 * The continuous monitoring loop.
 *
 * A one-shot prediction answers "is this flight risky right now?". Conditions
 * move. This loop re-answers the question on a cadence for every tracked
 * flight, so a sector that departed nominal and flew into a developing storm is
 * caught while there is still time to do something about it.
 *
 * Each cycle: pull the flights that are due → refresh weather for the field
 * that currently matters → re-score the whole set in one batch call → persist a
 * snapshot → run the escalation rules against the *change*, not just the level.
 */

const TICK_MS = Number(process.env.MONITOR_TICK_MS || 30000);
const BATCH_SIZE = Number(process.env.MONITOR_BATCH_SIZE || 25);
// After this many consecutive failures a flight is parked rather than retried
// forever — and it is parked loudly, with lastError set.
const MAX_CONSECUTIVE_FAILURES = 5;

let timer = null;
let cycleInFlight = false;

const stats = {
  startedAt: null,
  cycles: 0,
  checks: 0,
  incidents: 0,
  failures: 0,
  lastCycleAt: null,
  lastError: null,
};

/**
 * Builds the 24-field payload for this instant: fixed flight facts, plus the
 * live phase, plus live weather at whichever field currently matters.
 */
async function preparePayload(flight, now = new Date()) {
  const phase = derivePhase(flight.scheduledDeparture, flight.blockMinutes, now);
  const field = relevantField(phase.phase);
  const city = field === 'arrival' ? flight.arrivalCity : flight.departureCity;

  const flightData = { ...flight.baselineData, flight_phase: phase.phase };
  let weather = null;
  let weatherSource = 'baseline';

  try {
    const observation = await weatherService.fetchForCity(city);
    Object.assign(flightData, observation.fields);
    weather = {
      field,
      city,
      station: observation.station,
      description: observation.description,
      observedAt: observation.observedAt,
      gustKnots: observation.gustKnots,
      ...observation.fields,
    };
    weatherSource = observation.cached ? 'cached' : 'live';
  } catch (error) {
    // Losing the weather feed must not stop risk monitoring. Fall back to the
    // last values on file and mark the snapshot so nobody mistakes a stale
    // reading for a live observation.
    const previous = await RiskSnapshot.findOne({ flight: flight._id, weather: { $ne: null } })
      .sort({ createdAt: -1 })
      .select('weather');

    if (previous?.weather) {
      Object.assign(flightData, {
        weather_condition: previous.weather.weather_condition,
        visibility_km: previous.weather.visibility_km,
        wind_speed_knots: previous.weather.wind_speed_knots,
        wind_direction: previous.weather.wind_direction,
        temperature_c: previous.weather.temperature_c,
        precipitation_mm: previous.weather.precipitation_mm,
        turbulence_severity: previous.weather.turbulence_severity,
      });
      weather = { ...previous.weather, stale: true };
      weatherSource = 'stale';
    }

    console.warn(`[monitor] weather unavailable for ${city}: ${error.message}`);
  }

  return { phase, flightData, weather, weatherSource };
}

/**
 * Persists one evaluation, escalates if the rules say so, and advances the
 * flight's monitoring state.
 */
async function applyResult(flight, prepared, prediction, settings, now = new Date()) {
  const { phase, flightData, weather, weatherSource } = prepared;

  const probability = prediction.risk_probability;
  const previousProbability = flight.latestProbability;
  const thresholds = escalationEngine.thresholdsFor(settings);

  const consecutiveHighChecks =
    probability >= thresholds.highRisk ? flight.consecutiveHighChecks + 1 : 0;

  const evaluation = escalationEngine.evaluate({
    probability,
    previousProbability,
    consecutiveHighChecks,
    flightData,
    settings,
  });

  const snapshot = await RiskSnapshot.create({
    flight: flight._id,
    user: flight.user,
    flightPhase: phase.phase,
    progress: phase.progress,
    riskProbability: probability,
    riskPrediction: prediction.risk_prediction,
    riskBand: prediction.risk_band || evaluation.band,
    delta: previousProbability === null ? null : evaluation.delta,
    contributingFactors: prediction.contributing_factors || [],
    baselineProbability: prediction.baseline_probability ?? null,
    recommendations: prediction.recommendations || [],
    combinedRecommendation: prediction.combined_recommendation || null,
    triggeredRules: evaluation.triggeredRules,
    severity: evaluation.severity,
    weather,
    weatherSource,
    modelVersion: prediction.model_version,
  });

  const peakProbability = Math.max(flight.peakProbability || 0, probability);

  const escalation = await escalationEngine.escalate({
    userId: flight.user,
    evaluation,
    probability,
    peakProbability,
    flightId: flight._id,
    snapshotId: snapshot._id,
    flightNumber: flight.flightNumber,
    route: `${flight.departureCity} → ${flight.arrivalCity}`,
    flightPhase: phase.phase,
    contributingFactors: prediction.contributing_factors || [],
    recommendations: prediction.recommendations || [],
    source: 'monitor',
    settings,
  });

  flight.previousProbability = previousProbability;
  flight.latestProbability = probability;
  flight.latestBand = snapshot.riskBand;
  flight.peakProbability = peakProbability;
  flight.currentPhase = phase.phase;
  flight.consecutiveHighChecks = consecutiveHighChecks;
  flight.checkCount += 1;
  flight.lastCheckedAt = now;
  flight.consecutiveFailures = 0;
  flight.lastError = null;

  if (severityRank(evaluation.severity) > severityRank(flight.highestSeverity)) {
    flight.highestSeverity = evaluation.severity;
  }

  if (phase.state === 'arrived') {
    flight.status = 'completed';
    flight.nextCheckAt = null;
  } else {
    flight.status = 'active';
    flight.nextCheckAt = new Date(now.getTime() + flight.intervalMinutes * 60000);
  }

  await flight.save();

  stats.checks += 1;
  if (escalation?.created) stats.incidents += 1;

  return { snapshot, evaluation, escalation, phase, weatherSource };
}

/**
 * Scores a single flight immediately. Backs `POST /api/monitor/:id/check`, so a
 * dispatcher never has to wait out the interval to see the current picture.
 */
async function checkFlight(flight, { settings = null } = {}) {
  const now = new Date();
  const alertSettings = settings || (await escalationEngine.settingsFor(flight.user));
  const prepared = await preparePayload(flight, now);
  const prediction = await mlClient.predict(prepared.flightData, { explain: true });
  return applyResult(flight, prepared, prediction, alertSettings, now);
}

async function recordFailure(flight, message) {
  flight.consecutiveFailures += 1;
  flight.lastError = message;
  stats.failures += 1;

  if (flight.consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
    flight.status = 'stopped';
    flight.lastError = `Monitoring stopped after ${MAX_CONSECUTIVE_FAILURES} consecutive failures: ${message}`;
    console.error(`[monitor] ${flight.flightNumber} parked — ${flight.lastError}`);
  } else {
    // Back off proportionally instead of hammering a service that is down.
    flight.nextCheckAt = new Date(
      Date.now() + flight.intervalMinutes * 60000 * flight.consecutiveFailures
    );
  }

  await flight.save();
}

async function runCycle() {
  if (cycleInFlight) return;
  cycleInFlight = true;
  const now = new Date();

  try {
    const due = await MonitoredFlight.find({
      status: { $in: ['scheduled', 'active'] },
      nextCheckAt: { $lte: now },
    })
      .sort({ nextCheckAt: 1 })
      .limit(BATCH_SIZE);

    if (!due.length) return;

    // Settings are per user and every flight of a user shares them — load each
    // one once per cycle instead of once per flight.
    const settingsCache = new Map();
    for (const flight of due) {
      const key = String(flight.user);
      if (!settingsCache.has(key)) {
        settingsCache.set(key, await escalationEngine.settingsFor(flight.user));
      }
    }

    // Weather first, in parallel — the service caches by city, so flights out of
    // the same hub share one upstream call.
    const prepared = await Promise.all(
      due.map(async (flight) => {
        try {
          return { flight, payload: await preparePayload(flight, now) };
        } catch (error) {
          return { flight, error };
        }
      })
    );

    const scorable = prepared.filter((p) => !p.error);

    for (const { flight, error } of prepared.filter((p) => p.error)) {
      console.error(`[monitor] payload build failed for ${flight.flightNumber}: ${error.message}`);
      await recordFailure(flight, error.message);
    }

    if (!scorable.length) return;

    // One round trip for the whole cycle.
    let results;
    try {
      results = await mlClient.predictBatch(
        scorable.map(({ flight, payload }) => ({
          reference: String(flight._id),
          data: payload.flightData,
        })),
        { explain: true }
      );
    } catch (error) {
      // The ML tier is down — back every flight off rather than dropping the
      // cycle silently.
      stats.lastError = error.message;
      console.error('[monitor] batch scoring failed:', error.message);
      for (const { flight } of scorable) await recordFailure(flight, error.message);
      return;
    }

    for (const { flight, payload } of scorable) {
      const result = results.get(String(flight._id));

      if (!result || !result.ok) {
        const message = result?.error || 'No result returned for this flight';
        console.error(`[monitor] scoring failed for ${flight.flightNumber}: ${message}`);
        await recordFailure(flight, message);
        continue;
      }

      try {
        await applyResult(flight, payload, result, settingsCache.get(String(flight.user)), now);
      } catch (error) {
        console.error(`[monitor] persisting ${flight.flightNumber} failed: ${error.message}`);
        await recordFailure(flight, error.message);
      }
    }

    stats.cycles += 1;
    stats.lastCycleAt = new Date();
  } catch (error) {
    stats.lastError = error.message;
    console.error('[monitor] cycle failed:', error.message);
  } finally {
    cycleInFlight = false;
  }
}

function start() {
  if (timer) return;
  stats.startedAt = new Date();
  timer = setInterval(runCycle, TICK_MS);
  // Do not block server startup on the first cycle.
  setTimeout(runCycle, 2000);
  console.log(`[monitor] continuous flight-risk monitoring started (tick ${TICK_MS / 1000}s)`);
}

function stop() {
  if (timer) clearInterval(timer);
  timer = null;
}

function getStats() {
  return { ...stats, running: Boolean(timer), tickSeconds: TICK_MS / 1000 };
}

module.exports = { start, stop, runCycle, checkFlight, preparePayload, getStats };

const crypto = require('crypto');

const Incident = require('../models/Incident');
const AlertSettings = require('../models/AlertSettings');
const User = require('../models/User');
const notificationService = require('./notificationService');
const {
  RULES,
  SEVERITY,
  THRESHOLDS,
  INCIDENT_COOLDOWN_MINUTES,
  bandFor,
  bumpSeverity,
  severityRank,
} = require('../config/riskPolicy');

/**
 * Turns a risk score into a decision: is this an incident, how bad, and who
 * gets told.
 *
 * Severity is derived from *how many of the three primary conditions coincide*,
 * not from the probability alone. A 75% risk in cruise on a clear day is an
 * advisory. The same 75% on approach into a snowstorm is an emergency. That
 * distinction is the whole reason this layer exists.
 */

function referenceCode() {
  return `INC-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
}

/** Loads a user's alert routing, creating the default document on first use. */
async function settingsFor(userId) {
  let settings = await AlertSettings.findOne({ user: userId });
  if (settings) return settings;

  const user = await User.findById(userId).select('email');
  settings = await AlertSettings.create({
    user: userId,
    // Sensible default so the very first alert reaches a human: the account
    // owner acts as dispatcher until the OCC contacts are filled in.
    dispatcherEmail: user?.email || null,
  });
  return settings;
}

function thresholdsFor(settings) {
  return {
    ...THRESHOLDS,
    highRisk: settings?.highRiskThreshold ?? THRESHOLDS.highRisk,
    escalationDelta: settings?.escalationDelta ?? THRESHOLDS.escalationDelta,
  };
}

/**
 * Runs the rule catalogue and derives a severity.
 *
 * @returns {{severity, band, delta, triggeredRules, primaryCount}}
 */
function evaluate({
  probability,
  previousProbability = null,
  consecutiveHighChecks = 0,
  flightData,
  settings = null,
}) {
  const thresholds = thresholdsFor(settings);
  const delta = previousProbability === null ? 0 : probability - previousProbability;

  const ctx = {
    probability,
    previousProbability,
    delta,
    consecutiveHighChecks,
    flightData,
    thresholds,
  };

  const triggeredRules = RULES.filter((rule) => {
    try {
      return rule.test(ctx);
    } catch {
      // A malformed flight record must not take the monitoring loop down.
      return false;
    }
  }).map((rule) => ({
    code: rule.code,
    kind: rule.kind,
    label: rule.label,
    detail: rule.describe(ctx),
  }));

  const primaryCount = triggeredRules.filter((r) => r.kind === 'primary').length;
  const bumpingRules = triggeredRules.filter(
    (r) => r.kind === 'secondary' && RULES.find((x) => x.code === r.code)?.bumps
  );

  let severity;
  if (primaryCount >= 3) severity = SEVERITY.EMERGENCY;
  else if (primaryCount === 2) severity = SEVERITY.ALERT;
  else if (primaryCount === 1) severity = SEVERITY.ADVISORY;
  else severity = triggeredRules.length ? SEVERITY.WATCH : SEVERITY.NONE;

  // A trend rule or a sustained-high rule raises the tier by one, but only for
  // situations that already had a primary condition — context alone is not an
  // emergency.
  if (bumpingRules.length && primaryCount >= 1) {
    severity = bumpSeverity(severity, 1);
  }

  // Hard floor: anything the model puts in the critical band is at minimum an
  // alert, regardless of how the conditions decompose.
  if (probability >= 0.85 && severityRank(severity) < severityRank(SEVERITY.ALERT)) {
    severity = SEVERITY.ALERT;
  }

  return {
    severity,
    band: bandFor(probability),
    delta: Number(delta.toFixed(4)),
    triggeredRules,
    primaryCount,
  };
}

function summarise(evaluation, probability, flightNumber, phase) {
  const reasons = evaluation.triggeredRules.map((r) => r.label.toLowerCase());
  const head = `${flightNumber || 'Flight'} at ${(probability * 100).toFixed(1)}% predicted risk during ${phase || 'flight'}`;
  return reasons.length ? `${head} — ${reasons.join('; ')}.` : `${head}.`;
}

/**
 * Opens, or updates, an incident and fans out the notifications.
 *
 * Deduplication matters as much as detection: a flight parked at 80% risk would
 * otherwise raise a fresh incident every cycle. Inside the cooldown window a
 * re-trigger appends an update to the open incident, and only re-pages people
 * if the severity actually went up.
 *
 * @returns {Promise<{incident, created, escalated, notified}|null>} null when
 *          nothing needed escalating.
 */
async function escalate({
  userId,
  evaluation,
  probability,
  peakProbability = probability,
  flightId = null,
  snapshotId = null,
  flightNumber = null,
  route = null,
  flightPhase = null,
  contributingFactors = [],
  source = 'monitor',
  settings = null,
}) {
  if (evaluation.severity === SEVERITY.NONE) return null;

  const alertSettings = settings || (await settingsFor(userId));
  const summary = summarise(evaluation, probability, flightNumber, flightPhase);

  const cooldownStart = new Date(Date.now() - INCIDENT_COOLDOWN_MINUTES * 60000);
  const existing = flightId
    ? await Incident.findOne({
        flight: flightId,
        status: { $in: ['open', 'acknowledged'] },
        lastTriggeredAt: { $gte: cooldownStart },
      }).sort({ createdAt: -1 })
    : null;

  if (existing) {
    const worsened = severityRank(evaluation.severity) > severityRank(existing.severity);

    existing.updates.push({
      at: new Date(),
      riskProbability: probability,
      severity: evaluation.severity,
      flightPhase,
      note: worsened ? 'Severity increased' : 'Conditions persist',
    });
    existing.lastTriggeredAt = new Date();
    existing.riskProbability = probability;
    existing.peakProbability = Math.max(existing.peakProbability, peakProbability);
    existing.flightPhase = flightPhase;
    existing.triggeredRules = evaluation.triggeredRules;
    existing.contributingFactors = contributingFactors;
    existing.snapshot = snapshotId || existing.snapshot;

    if (worsened) {
      existing.severity = evaluation.severity;
      existing.summary = summary;
      // A worsening situation re-opens an acknowledged incident: the person who
      // acknowledged it signed off on a smaller problem than the one now in
      // front of them.
      existing.status = 'open';
      existing.acknowledgedAt = null;
      existing.acknowledgedBy = null;

      const notifications = await notificationService.dispatch(existing, alertSettings);
      existing.notifications.push(...notifications);
      await existing.save();
      return { incident: existing, created: false, escalated: true, notified: notifications };
    }

    await existing.save();
    return { incident: existing, created: false, escalated: false, notified: [] };
  }

  const incident = new Incident({
    user: userId,
    flight: flightId,
    snapshot: snapshotId,
    reference: referenceCode(),
    flightNumber,
    route,
    severity: evaluation.severity,
    riskProbability: probability,
    peakProbability,
    flightPhase,
    triggeredRules: evaluation.triggeredRules,
    contributingFactors,
    summary,
    source,
    updates: [
      {
        at: new Date(),
        riskProbability: probability,
        severity: evaluation.severity,
        flightPhase,
        note: 'Incident raised',
      },
    ],
  });

  const notifications = await notificationService.dispatch(incident, alertSettings);
  incident.notifications = notifications;
  await incident.save();

  console.log(
    `[escalation] ${incident.reference} severity=${incident.severity} ` +
      `flight=${flightNumber || 'n/a'} risk=${(probability * 100).toFixed(1)}% ` +
      `sent=${notifications.filter((n) => n.status === 'sent').length}/${notifications.length}`
  );

  return { incident, created: true, escalated: true, notified: notifications };
}

module.exports = { evaluate, escalate, settingsFor, thresholdsFor, summarise };

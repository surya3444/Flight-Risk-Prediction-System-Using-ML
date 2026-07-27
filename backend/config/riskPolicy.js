/**
 * The escalation policy — the single place that decides "how bad is this, and
 * who needs to know".
 *
 * Deliberately data-driven rather than a pile of if-statements: an operator can
 * read this file and understand exactly what will page them at 3am, and the
 * frontend renders the same rule catalogue so the UI never invents its own
 * thresholds.
 *
 * Bands here must stay in sync with RISK_BANDS in `ML Model/risk_schema.py`.
 */

const RISK_BANDS = [
  { floor: 0.85, band: 'critical' },
  { floor: 0.70, band: 'high' },
  { floor: 0.55, band: 'elevated' },
  { floor: 0.40, band: 'advisory' },
  { floor: 0.00, band: 'nominal' },
];

const THRESHOLDS = {
  // The headline trigger: "risk above 70%".
  highRisk: 0.70,
  // Below the headline, but high enough to matter during a critical phase.
  elevatedRisk: 0.55,
  // A jump of this size between two consecutive checks is itself a signal, even
  // if the absolute number is not yet at the high-risk line.
  escalationDelta: 0.15,
  // Consecutive high-risk checks before the situation counts as "sustained".
  sustainedChecks: 2,
};

// Phases where there is the least margin to absorb a problem.
const CRITICAL_PHASES = ['takeoff', 'landing'];

const ADVERSE_WEATHER = ['storm', 'snow'];

const SEVERITY = {
  NONE: 'none',
  WATCH: 'watch',
  ADVISORY: 'advisory',
  ALERT: 'alert',
  EMERGENCY: 'emergency',
};

// Ordered weakest → strongest so severity can be compared numerically.
const SEVERITY_ORDER = [
  SEVERITY.NONE,
  SEVERITY.WATCH,
  SEVERITY.ADVISORY,
  SEVERITY.ALERT,
  SEVERITY.EMERGENCY,
];

/**
 * Notification routing. This is what makes the system an *operations* tool
 * rather than a cockpit device: nothing here talks to a pilot. Alerts go to the
 * Operations Control Centre, the duty manager and the dispatcher, who are the
 * people actually authorised to act on them.
 */
const ROUTING = {
  [SEVERITY.WATCH]: {
    channels: [],
    label: 'Watch',
    action: 'Logged for the OCC board. No one is paged.',
  },
  [SEVERITY.ADVISORY]: {
    channels: ['dispatcher'],
    label: 'Advisory',
    action: 'Dispatcher notified by email.',
  },
  [SEVERITY.ALERT]: {
    channels: ['dispatcher', 'dutyManager', 'occWebhook'],
    label: 'Alert',
    action: 'Dispatcher and duty manager notified; OCC feed updated.',
  },
  [SEVERITY.EMERGENCY]: {
    channels: ['dispatcher', 'dutyManager', 'dutyManagerSms', 'occWebhook'],
    label: 'Emergency',
    action: 'Full escalation — duty manager paged by SMS, OCC feed updated, incident opened.',
  },
};

/**
 * The rule catalogue.
 *
 * `primary` rules are the three conditions in the operating procedure — high
 * risk, a critical flight phase, adverse weather. The count of primary rules
 * that fire sets the base severity, so all three at once (the classic
 * "high risk on approach into a storm") is what produces a full escalation.
 *
 * `secondary` rules add context and can bump the severity by one tier, but on
 * their own never do more than raise a watch item.
 */
const RULES = [
  {
    code: 'HIGH_RISK_PROBABILITY',
    kind: 'primary',
    label: 'Risk above high-risk threshold',
    describe: (ctx) => `Model risk ${(ctx.probability * 100).toFixed(1)}% exceeds the ${(ctx.thresholds.highRisk * 100).toFixed(0)}% action threshold.`,
    test: (ctx) => ctx.probability >= ctx.thresholds.highRisk,
  },
  {
    code: 'CRITICAL_PHASE',
    kind: 'primary',
    label: 'Elevated risk in a critical flight phase',
    describe: (ctx) => `Aircraft is in the ${ctx.flightData.flight_phase} phase with risk at ${(ctx.probability * 100).toFixed(1)}%.`,
    test: (ctx) =>
      CRITICAL_PHASES.includes(ctx.flightData.flight_phase) &&
      ctx.probability >= ctx.thresholds.elevatedRisk,
  },
  {
    code: 'ADVERSE_WEATHER',
    kind: 'primary',
    label: 'Adverse weather at the active field',
    describe: (ctx) => {
      const d = ctx.flightData;
      const parts = [];
      if (ADVERSE_WEATHER.includes(d.weather_condition)) parts.push(`${d.weather_condition} conditions`);
      if (d.visibility_km < 3) parts.push(`visibility ${Number(d.visibility_km).toFixed(1)} km`);
      if (d.wind_speed_knots > 45) parts.push(`winds ${d.wind_speed_knots} kt`);
      if (d.turbulence_severity === 'severe') parts.push('severe turbulence');
      return `Reported ${parts.join(', ')}.`;
    },
    test: (ctx) => {
      const d = ctx.flightData;
      return (
        ADVERSE_WEATHER.includes(d.weather_condition) ||
        d.visibility_km < 3 ||
        d.wind_speed_knots > 45 ||
        d.turbulence_severity === 'severe'
      );
    },
  },
  {
    code: 'RISK_ESCALATING',
    kind: 'secondary',
    bumps: true,
    label: 'Risk trending sharply upward',
    describe: (ctx) =>
      `Risk rose ${(ctx.delta * 100).toFixed(1)} points since the previous check (${(ctx.previousProbability * 100).toFixed(1)}% → ${(ctx.probability * 100).toFixed(1)}%).`,
    test: (ctx) =>
      ctx.previousProbability !== null && ctx.delta >= ctx.thresholds.escalationDelta,
  },
  {
    code: 'SUSTAINED_HIGH_RISK',
    kind: 'secondary',
    bumps: true,
    label: 'Sustained high risk',
    describe: (ctx) => `Risk has stayed above the action threshold for ${ctx.consecutiveHighChecks} consecutive checks.`,
    test: (ctx) =>
      ctx.probability >= ctx.thresholds.highRisk &&
      ctx.consecutiveHighChecks >= ctx.thresholds.sustainedChecks,
  },
  {
    code: 'LOW_VISIBILITY_APPROACH',
    kind: 'secondary',
    bumps: true,
    label: 'Low visibility on approach',
    describe: (ctx) => `Visibility ${Number(ctx.flightData.visibility_km).toFixed(1)} km during ${ctx.flightData.flight_phase}.`,
    test: (ctx) =>
      ctx.flightData.visibility_km < 2 &&
      ['descent', 'landing'].includes(ctx.flightData.flight_phase),
  },
  {
    code: 'MAINTENANCE_EXPOSURE',
    kind: 'secondary',
    label: 'Airframe and maintenance exposure',
    describe: (ctx) =>
      `${ctx.flightData.aircraft_age}-year-old airframe, ${ctx.flightData.last_maintenance_hours} h since last maintenance.`,
    test: (ctx) =>
      ctx.flightData.aircraft_age > 20 && ctx.flightData.last_maintenance_hours > 300,
  },
  {
    code: 'CREW_EXPERIENCE',
    kind: 'secondary',
    label: 'Crew experience against route complexity',
    describe: (ctx) =>
      `Captain at ${ctx.flightData.pilot_experience} h on a route rated ${ctx.flightData.route_complexity} for complexity.`,
    test: (ctx) =>
      ctx.flightData.pilot_experience < 1500 && ctx.flightData.route_complexity > 0.7,
  },
];

// How long an open incident absorbs further triggers instead of opening a new
// one. Without this, a flight sitting at 80% risk would open an incident every
// monitoring cycle and the OCC board would be unusable.
const INCIDENT_COOLDOWN_MINUTES = 20;

// Default cadence for continuous monitoring.
const DEFAULT_INTERVAL_MINUTES = 5;
const MIN_INTERVAL_MINUTES = 1;
const MAX_INTERVAL_MINUTES = 60;

function bandFor(probability) {
  const match = RISK_BANDS.find((b) => probability >= b.floor);
  return match ? match.band : 'nominal';
}

function severityRank(severity) {
  const index = SEVERITY_ORDER.indexOf(severity);
  return index === -1 ? 0 : index;
}

function bumpSeverity(severity, steps = 1) {
  const next = Math.min(severityRank(severity) + steps, SEVERITY_ORDER.length - 1);
  return SEVERITY_ORDER[next];
}

function isAtLeast(severity, floor) {
  return severityRank(severity) >= severityRank(floor);
}

module.exports = {
  RISK_BANDS,
  THRESHOLDS,
  CRITICAL_PHASES,
  ADVERSE_WEATHER,
  SEVERITY,
  SEVERITY_ORDER,
  ROUTING,
  RULES,
  INCIDENT_COOLDOWN_MINUTES,
  DEFAULT_INTERVAL_MINUTES,
  MIN_INTERVAL_MINUTES,
  MAX_INTERVAL_MINUTES,
  bandFor,
  severityRank,
  bumpSeverity,
  isAtLeast,
};

const { ROUTING } = require('../config/riskPolicy');

/**
 * Builds a shareable operational risk advisory.
 *
 * The framing matters as much as the content. This system does not talk to ATC
 * and has no standing to file anything: it produces an *internal* advisory that
 * a dispatcher or duty manager can read, act on, and forward through whatever
 * channel is appropriate. Every rendering carries a disclaimer saying exactly
 * that, because a document that merely looks official is worse than no document
 * — someone will eventually treat it as one.
 */

const pct = (p) => (p === null || p === undefined ? 'n/a' : `${(p * 100).toFixed(1)}%`);

const DISCLAIMER = [
  'This is an internal operational risk advisory produced by an automated',
  'decision-support system from a predictive model and live weather data.',
  '',
  'It is NOT an air traffic control communication. It is NOT a Mandatory',
  'Occurrence Report, Air Safety Report or any other regulatory filing, and it',
  'does not discharge any reporting obligation. It does not replace ATC, TCAS,',
  'GPWS, weather radar, the dispatch release or the authority of the',
  'pilot-in-command.',
  '',
  'Operational decisions rest with the dispatcher and the commander.',
].join('\n');

function referenceFor(source, issuedAt) {
  const stamp = issuedAt.toISOString().slice(0, 10).replace(/-/g, '');
  const tail = (source.reference || String(source._id)).slice(-6).toUpperCase();
  return `OPS-ADV-${stamp}-${tail}`;
}

/**
 * Normalises an incident (or a flight plus its latest snapshot) into one report
 * shape, so the renderers and the UI never branch on where it came from.
 */
function build({ incident = null, flight = null, snapshot = null, settings = {} }) {
  const issuedAt = new Date();
  const source = incident || flight;
  if (!source) throw new Error('A report needs an incident or a monitored flight');

  const risk = incident ? incident.riskProbability : snapshot?.riskProbability;
  const severity = incident ? incident.severity : snapshot?.severity;

  const factors = incident?.contributingFactors?.length
    ? incident.contributingFactors
    : snapshot?.contributingFactors || [];

  const recommendations = incident?.recommendations?.length
    ? incident.recommendations
    : snapshot?.recommendations || [];

  const rules = incident?.triggeredRules?.length
    ? incident.triggeredRules
    : snapshot?.triggeredRules || [];

  return {
    reference: referenceFor(source, issuedAt),
    issuedAt,
    originator: settings.occName || 'Operations Control Centre',

    flight: {
      number: incident?.flightNumber || flight?.flightNumber || 'Not assigned',
      route:
        incident?.route ||
        (flight ? `${flight.departureCity} → ${flight.arrivalCity}` : 'Not recorded'),
      operator: flight?.baselineData?.airline || null,
      aircraftType: flight?.baselineData?.aircraft_type || null,
      phase: incident?.flightPhase || snapshot?.flightPhase || null,
      scheduledDeparture: flight?.scheduledDeparture || null,
      blockMinutes: flight?.blockMinutes || null,
    },

    assessment: {
      riskProbability: risk,
      peakProbability: incident?.peakProbability ?? flight?.peakProbability ?? risk,
      baselineProbability: snapshot?.baselineProbability ?? null,
      band: snapshot?.riskBand || null,
      severity,
      severityLabel: ROUTING[severity]?.label || severity || 'Nominal',
      modelVersion: snapshot?.modelVersion || null,
      evaluatedAt: snapshot?.createdAt || incident?.lastTriggeredAt || issuedAt,
      checkCount: flight?.checkCount ?? null,
    },

    conditions: {
      // The observation the score was actually computed from, kept so a reader
      // can audit the advisory rather than take it on faith.
      observation: snapshot?.weather || null,
      source: snapshot?.weatherSource || null,
    },

    reasons: rules.map((r) => ({ label: r.label, detail: r.detail, kind: r.kind })),
    factors: factors.map((f) => ({
      label: f.label,
      detail: f.detail || String(f.value),
      impact: f.impact,
    })),
    recommendations: recommendations.map((r) => ({
      action: r.action,
      category: r.category,
      detail: r.detail,
      riskBefore: r.risk_before,
      riskAfter: r.risk_after,
      reduction: r.reduction,
    })),

    incident: incident
      ? {
          reference: incident.reference,
          status: incident.status,
          raisedAt: incident.createdAt,
          acknowledgedAt: incident.acknowledgedAt,
          resolution: incident.resolution,
          notifications: incident.notifications || [],
        }
      : null,

    distribution: [
      settings.dispatcherEmail && `Dispatcher (${settings.dispatcherEmail})`,
      settings.dutyManagerEmail && `Duty Manager (${settings.dutyManagerEmail})`,
      settings.occWebhookUrl && 'OCC operations feed',
    ].filter(Boolean),

    disclaimer: DISCLAIMER,
  };
}

/** Fixed-width rendering — what gets emailed and what a text-only system reads. */
function toText(report) {
  const line = '='.repeat(72);
  const rule = '-'.repeat(72);
  const out = [];

  out.push(line);
  out.push('OPERATIONAL RISK ADVISORY');
  out.push(report.originator);
  out.push(line);
  out.push('');
  out.push(`Report reference : ${report.reference}`);
  out.push(`Issued           : ${report.issuedAt.toUTCString()}`);
  out.push(`Classification   : ${report.assessment.severityLabel.toUpperCase()} — internal advisory`);
  out.push('');

  out.push(rule);
  out.push('1. FLIGHT');
  out.push(rule);
  out.push(`Flight number    : ${report.flight.number}`);
  out.push(`Route            : ${report.flight.route}`);
  if (report.flight.operator) out.push(`Operator         : ${report.flight.operator}`);
  if (report.flight.aircraftType) out.push(`Aircraft type    : ${report.flight.aircraftType}`);
  if (report.flight.phase) out.push(`Phase of flight  : ${report.flight.phase}`);
  if (report.flight.scheduledDeparture) {
    out.push(`Scheduled dep.   : ${new Date(report.flight.scheduledDeparture).toUTCString()}`);
  }
  out.push('');

  out.push(rule);
  out.push('2. RISK ASSESSMENT');
  out.push(rule);
  out.push(`Predicted risk   : ${pct(report.assessment.riskProbability)}`);
  out.push(`Peak this flight : ${pct(report.assessment.peakProbability)}`);
  if (report.assessment.baselineProbability !== null) {
    out.push(`Nominal-day ref. : ${pct(report.assessment.baselineProbability)}`);
  }
  out.push(`Severity         : ${report.assessment.severityLabel.toUpperCase()}`);
  out.push(`Evaluated        : ${new Date(report.assessment.evaluatedAt).toUTCString()}`);
  if (report.assessment.modelVersion) out.push(`Model            : ${report.assessment.modelVersion}`);
  out.push('');

  if (report.reasons.length) {
    out.push(rule);
    out.push('3. REASON FOR ADVISORY');
    out.push(rule);
    report.reasons.forEach((r, i) => {
      out.push(`${String(i + 1).padStart(2)}. ${r.label}`);
      out.push(`    ${r.detail}`);
    });
    out.push('');
  }

  if (report.factors.length) {
    out.push(rule);
    out.push('4. CONTRIBUTING CONDITIONS');
    out.push(rule);
    out.push('Each figure is the risk this condition adds on its own, measured');
    out.push('against the same aircraft in nominal conditions.');
    out.push('');
    report.factors.forEach((f) => {
      out.push(`  ${f.label.padEnd(28)} ${String(f.detail).padEnd(26)} +${pct(f.impact)}`);
    });
    out.push('');
  }

  if (report.conditions.observation) {
    const w = report.conditions.observation;
    out.push(rule);
    out.push('5. OBSERVATION USED');
    out.push(rule);
    out.push(`Station          : ${w.station || w.city || 'n/a'} (${w.field || 'departure'} field)`);
    out.push(`Conditions       : ${w.weather_condition}, ${w.visibility_km} km visibility`);
    out.push(`Wind             : ${w.wind_speed_knots} kt / ${w.wind_direction}°`);
    out.push(`Temperature      : ${w.temperature_c} °C, precipitation ${w.precipitation_mm} mm`);
    out.push(`Turbulence       : ${w.turbulence_severity} (estimated, not a reported observation)`);
    out.push(`Data source      : ${report.conditions.source || 'live'}`);
    out.push('');
  }

  if (report.recommendations.length) {
    out.push(rule);
    out.push('6. RECOMMENDED ACTIONS');
    out.push(rule);
    out.push('Each option was applied to the flight and re-scored; the figures');
    out.push('are model outputs, not estimates.');
    out.push('');
    report.recommendations.forEach((r, i) => {
      out.push(`${String(i + 1).padStart(2)}. ${r.action}  [${r.category}]`);
      out.push(`    ${r.detail}`);
      out.push(`    Predicted risk ${pct(r.riskBefore)} -> ${pct(r.riskAfter)}`);
    });
    out.push('');
  }

  if (report.distribution.length) {
    out.push(rule);
    out.push('7. DISTRIBUTION');
    out.push(rule);
    report.distribution.forEach((d) => out.push(`  - ${d}`));
    out.push('');
  }

  out.push(line);
  out.push('DISCLAIMER');
  out.push(line);
  out.push(report.disclaimer);
  out.push('');
  out.push(line);
  out.push(`End of advisory ${report.reference}`);

  return out.join('\n');
}

module.exports = { build, toText, DISCLAIMER, pct };

const { ROUTING } = require('../config/riskPolicy');

const pct = (p) => `${(p * 100).toFixed(1)}%`;

function severityLabel(severity) {
  return (ROUTING[severity]?.label || severity).toUpperCase();
}

function subjectFor(incident) {
  const flight = incident.flightNumber || 'UNSCHEDULED';
  return `[${severityLabel(incident.severity)}] ${flight} — flight risk ${pct(incident.riskProbability)}`;
}

/**
 * The plain-text body. This is the authoritative version — it is what an SMS
 * gateway, a text-only terminal and the incident log all read.
 */
function textBody(incident, { recipientRole, occName }) {
  const lines = [
    `${occName} — AUTOMATED FLIGHT RISK ESCALATION`,
    '',
    `Severity      : ${severityLabel(incident.severity)}`,
    `Incident ref  : ${incident.reference}`,
    `Flight        : ${incident.flightNumber || 'n/a'}`,
    `Route         : ${incident.route || 'n/a'}`,
    `Phase         : ${incident.flightPhase || 'n/a'}`,
    `Current risk  : ${pct(incident.riskProbability)}`,
    `Peak risk     : ${pct(incident.peakProbability)}`,
    '',
    'WHY THIS ESCALATED',
  ];

  incident.triggeredRules.forEach((rule) => {
    lines.push(`  • ${rule.label} — ${rule.detail}`);
  });

  if (incident.contributingFactors?.length) {
    lines.push('', 'RISK CONTRIBUTORS');
    incident.contributingFactors.forEach((f) => {
      const detail = f.detail || f.value;
      lines.push(`  • ${f.label} (${detail}) — adds ${pct(f.impact)} on its own`);
    });
  }

  if (incident.recommendations?.length) {
    lines.push('', 'RECOMMENDED ACTIONS (model-scored)');
    incident.recommendations.forEach((r) => {
      lines.push(
        `  • ${r.action} — risk ${pct(r.risk_before)} → ${pct(r.risk_after)}`,
        `      ${r.detail}`
      );
    });
  }

  lines.push(
    '',
    `ROUTED TO : ${recipientRole}`,
    `ACTION    : ${ROUTING[incident.severity]?.action || 'Review in the Operations Centre.'}`,
    '',
    'This is a decision-support advisory generated from a predictive model and',
    'live weather. It does not replace ATC, dispatch release or commander',
    'authority. Acknowledge the incident in the Operations Centre once actioned.'
  );

  return lines.join('\n');
}

const SEVERITY_COLOUR = {
  emergency: '#d03b3b',
  alert: '#ec835a',
  advisory: '#fab219',
  watch: '#3987e5',
};

function htmlBody(incident, { recipientRole, occName }) {
  const colour = SEVERITY_COLOUR[incident.severity] || '#3987e5';
  const row = (k, v) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#52514e;font-size:13px;white-space:nowrap">${k}</td>` +
    `<td style="padding:6px 0;color:#0b0b0b;font-size:14px;font-weight:600">${v}</td></tr>`;

  const rules = incident.triggeredRules
    .map(
      (r) =>
        `<li style="margin-bottom:8px"><strong style="color:#0b0b0b">${r.label}</strong>` +
        `<br><span style="color:#52514e;font-size:13px">${r.detail}</span></li>`
    )
    .join('');

  const factors = (incident.contributingFactors || [])
    .map(
      (f) =>
        `<li style="margin-bottom:6px;color:#52514e;font-size:13px">` +
        `<strong style="color:#0b0b0b">${f.label}</strong> ` +
        `<span style="color:#898781">${f.detail || f.value}</span> ` +
        `<strong style="color:#d03b3b">+${pct(f.impact)}</strong></li>`
    )
    .join('');

  const actions = (incident.recommendations || [])
    .map(
      (r) =>
        `<li style="margin-bottom:10px;color:#52514e;font-size:13px">` +
        `<strong style="color:#0b0b0b">${r.action}</strong> ` +
        `<span style="color:#0ca30c;font-weight:600">${pct(r.risk_before)} &rarr; ${pct(r.risk_after)}</span>` +
        `<br><span style="color:#898781">${r.detail}</span></li>`
    )
    .join('');

  return `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f9f9f7;padding:24px">
  <div style="max-width:600px;margin:0 auto;background:#fcfcfb;border:1px solid rgba(11,11,11,0.10);border-radius:12px;overflow:hidden">
    <div style="background:${colour};padding:18px 24px">
      <div style="color:#fff;font-size:12px;letter-spacing:.14em;text-transform:uppercase;opacity:.9">${occName}</div>
      <div style="color:#fff;font-size:20px;font-weight:700;margin-top:4px">${severityLabel(incident.severity)} — ${incident.flightNumber || 'Unscheduled flight'}</div>
    </div>

    <div style="padding:22px 24px">
      <div style="font-size:34px;font-weight:700;color:${colour};line-height:1">${pct(incident.riskProbability)}</div>
      <div style="font-size:13px;color:#52514e;margin-top:2px">predicted risk · peak ${pct(incident.peakProbability)}</div>

      <table style="margin-top:20px;border-collapse:collapse;width:100%">
        ${row('Incident ref', incident.reference)}
        ${row('Route', incident.route || 'n/a')}
        ${row('Flight phase', incident.flightPhase || 'n/a')}
        ${row('Routed to', recipientRole)}
      </table>

      <h3 style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#898781;margin:26px 0 10px">Why this escalated</h3>
      <ul style="margin:0;padding-left:18px">${rules}</ul>

      ${actions ? `<h3 style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#898781;margin:24px 0 10px">Recommended actions</h3><ul style="margin:0;padding-left:18px">${actions}</ul>` : ''}

      ${factors ? `<h3 style="font-size:12px;letter-spacing:.12em;text-transform:uppercase;color:#898781;margin:24px 0 10px">Risk contributors</h3><ul style="margin:0;padding-left:18px">${factors}</ul>` : ''}

      <div style="margin-top:24px;padding:14px 16px;background:#f0efec;border-radius:8px;font-size:13px;color:#52514e;line-height:1.6">
        <strong style="color:#0b0b0b">Action:</strong> ${ROUTING[incident.severity]?.action || 'Review in the Operations Centre.'}
      </div>

      <p style="margin:20px 0 0;font-size:12px;color:#898781;line-height:1.6">
        Decision-support advisory generated from a predictive model and live weather.
        It does not replace ATC, dispatch release or commander authority.
        Acknowledge this incident in the Operations Centre once actioned.
      </p>
    </div>
  </div>
</div>`.trim();
}

/** SMS has to fit in a glance — everything that is not actionable is dropped. */
function smsBody(incident) {
  return (
    `${severityLabel(incident.severity)} ${incident.flightNumber || 'FLT'} ` +
    `risk ${pct(incident.riskProbability)} in ${incident.flightPhase || 'flight'}. ` +
    `${incident.triggeredRules[0]?.label || 'Multiple risk conditions'}. ` +
    `Ref ${incident.reference}. Check OCC.`
  );
}

module.exports = { subjectFor, textBody, htmlBody, smsBody, severityLabel, pct };

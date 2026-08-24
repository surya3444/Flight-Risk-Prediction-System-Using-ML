const Incident = require('../models/Incident');
const MonitoredFlight = require('../models/MonitoredFlight');
const RiskSnapshot = require('../models/RiskSnapshot');
const reportBuilder = require('../services/reportBuilder');
const escalationEngine = require('../services/escalationEngine');
const sendEmail = require('../utils/sendEmail');

/** Loads the report source and its settings, or returns null if not the user's. */
async function loadSource(req) {
  const settings = await escalationEngine.settingsFor(req.user.id);

  if (req.params.incidentId) {
    const incident = await Incident.findOne({
      _id: req.params.incidentId,
      user: req.user.id,
    }).populate('flight');

    if (!incident) return null;

    // The snapshot carries the observation and the model version — the parts
    // that make the advisory auditable rather than just assertive.
    const snapshot = incident.snapshot
      ? await RiskSnapshot.findById(incident.snapshot)
      : null;

    return { incident, flight: incident.flight, snapshot, settings };
  }

  const flight = await MonitoredFlight.findOne({
    _id: req.params.flightId,
    user: req.user.id,
  });
  if (!flight) return null;

  const snapshot = await RiskSnapshot.findOne({ flight: flight._id }).sort({ createdAt: -1 });
  return { flight, snapshot, settings };
}

/** GET /api/reports/incident/:incidentId — structured advisory. */
exports.getReport = async (req, res) => {
  try {
    const source = await loadSource(req);
    if (!source) return res.status(404).json({ success: false, error: 'Not found' });

    const report = reportBuilder.build(source);
    res.json({ success: true, data: report, text: reportBuilder.toText(report) });
  } catch (error) {
    console.error('Report build failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not build the advisory.' });
  }
};

/**
 * POST /api/reports/.../send — emails the advisory to the operations contacts.
 *
 * Deliberately reuses the alert routing rather than accepting an arbitrary
 * recipient: an operational advisory should go to the people already
 * responsible for the flight, and an open "send to any address" endpoint on an
 * authenticated app is a spam relay waiting to happen.
 */
exports.sendReport = async (req, res) => {
  try {
    const source = await loadSource(req);
    if (!source) return res.status(404).json({ success: false, error: 'Not found' });

    const { settings } = source;
    const report = reportBuilder.build(source);
    const text = reportBuilder.toText(report);

    const recipients = [
      settings.dispatcherEmail && { address: settings.dispatcherEmail, role: 'Dispatcher' },
      settings.dutyManagerEmail && { address: settings.dutyManagerEmail, role: 'Duty Manager' },
    ].filter(Boolean);

    if (!recipients.length) {
      return res.status(400).json({
        success: false,
        error:
          'No operations contacts configured. Add a dispatcher or duty manager address in Alert Routing.',
      });
    }

    const subject =
      `[ADVISORY] ${report.flight.number} — ${report.assessment.severityLabel.toUpperCase()} — ` +
      `risk ${reportBuilder.pct(report.assessment.riskProbability)} (${report.reference})`;

    const results = [];
    for (const recipient of recipients) {
      try {
        await sendEmail(recipient.address, subject, text, htmlFor(report, recipient.role));
        results.push({ channel: recipient.role, target: recipient.address, status: 'sent' });
      } catch (error) {
        results.push({
          channel: recipient.role,
          target: recipient.address,
          status: 'failed',
          detail: error.message,
        });
      }
    }

    // Filed against the incident so the audit trail shows the advisory went out.
    if (source.incident) {
      source.incident.notifications.push(
        ...results.map((r) => ({
          channel: `advisory:${r.channel}`,
          target: r.target,
          status: r.status,
          detail: r.detail || `Advisory ${report.reference} sent`,
          at: new Date(),
        }))
      );
      await source.incident.save();
    }

    const delivered = results.filter((r) => r.status === 'sent').length;
    res.status(delivered ? 200 : 502).json({
      success: delivered > 0,
      data: { reference: report.reference, results, delivered, attempted: results.length },
      error: delivered ? null : 'The advisory could not be delivered to any contact.',
    });
  } catch (error) {
    console.error('Report send failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/** Print-friendly HTML body for the emailed advisory. */
function htmlFor(report, recipientRole) {
  const esc = (v) =>
    String(v ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[c]);

  const section = (n, title, body) => `
    <h2 style="font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#898781;
               border-bottom:1px solid #e1e0d9;padding-bottom:6px;margin:26px 0 12px">
      ${n}. ${esc(title)}
    </h2>${body}`;

  const rows = (pairs) =>
    `<table style="border-collapse:collapse;width:100%">${pairs
      .filter(([, v]) => v !== null && v !== undefined && v !== '')
      .map(
        ([k, v]) =>
          `<tr><td style="padding:4px 16px 4px 0;color:#52514e;font-size:13px;white-space:nowrap">${esc(k)}</td>` +
          `<td style="padding:4px 0;color:#0b0b0b;font-size:13px;font-weight:600">${esc(v)}</td></tr>`
      )
      .join('')}</table>`;

  return `
<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;background:#f9f9f7;padding:24px">
  <div style="max-width:680px;margin:0 auto;background:#fcfcfb;border:1px solid rgba(11,11,11,.1);border-radius:10px;padding:28px">
    <div style="border-bottom:2px solid #0b0b0b;padding-bottom:12px;margin-bottom:18px">
      <div style="font-size:11px;letter-spacing:.16em;text-transform:uppercase;color:#898781">${esc(report.originator)}</div>
      <div style="font-size:22px;font-weight:700;color:#0b0b0b;margin-top:4px">Operational Risk Advisory</div>
      <div style="font-size:12px;color:#52514e;margin-top:4px">
        ${esc(report.reference)} · issued ${esc(report.issuedAt.toUTCString())} · routed to ${esc(recipientRole)}
      </div>
    </div>

    ${section('1', 'Flight', rows([
      ['Flight number', report.flight.number],
      ['Route', report.flight.route],
      ['Operator', report.flight.operator],
      ['Aircraft type', report.flight.aircraftType],
      ['Phase of flight', report.flight.phase],
    ]))}

    ${section('2', 'Risk assessment', `
      <div style="font-size:32px;font-weight:700;color:#d03b3b;line-height:1">
        ${esc(reportBuilder.pct(report.assessment.riskProbability))}
      </div>
      <div style="font-size:13px;color:#52514e;margin:2px 0 10px">
        ${esc(report.assessment.severityLabel.toUpperCase())} ·
        peak ${esc(reportBuilder.pct(report.assessment.peakProbability))}
      </div>`)}

    ${report.reasons.length ? section('3', 'Reason for advisory',
      `<ul style="margin:0;padding-left:18px">${report.reasons
        .map((r) => `<li style="margin-bottom:8px;font-size:13px"><strong>${esc(r.label)}</strong><br>
             <span style="color:#52514e">${esc(r.detail)}</span></li>`)
        .join('')}</ul>`) : ''}

    ${report.factors.length ? section('4', 'Contributing conditions',
      `<ul style="margin:0;padding-left:18px">${report.factors
        .map((f) => `<li style="margin-bottom:6px;font-size:13px"><strong>${esc(f.label)}</strong>
             <span style="color:#898781">${esc(f.detail)}</span>
             <strong style="color:#d03b3b">+${esc(reportBuilder.pct(f.impact))}</strong></li>`)
        .join('')}</ul>`) : ''}

    ${report.recommendations.length ? section('5', 'Recommended actions',
      `<ol style="margin:0;padding-left:18px">${report.recommendations
        .map((r) => `<li style="margin-bottom:10px;font-size:13px"><strong>${esc(r.action)}</strong>
             <span style="color:#0ca30c;font-weight:600">
               ${esc(reportBuilder.pct(r.riskBefore))} &rarr; ${esc(reportBuilder.pct(r.riskAfter))}</span>
             <br><span style="color:#52514e">${esc(r.detail)}</span></li>`)
        .join('')}</ol>`) : ''}

    <div style="margin-top:28px;padding:14px 16px;background:#f0efec;border-radius:8px;
                font-size:11px;color:#52514e;line-height:1.65;white-space:pre-line">${esc(report.disclaimer)}</div>
  </div>
</div>`.trim();
}

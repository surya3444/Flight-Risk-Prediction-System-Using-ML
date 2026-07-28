const sendEmail = require('../utils/sendEmail');
const escalationEngine = require('../services/escalationEngine');
const notificationService = require('../services/notificationService');
const { SEVERITY } = require('../config/riskPolicy');

const EDITABLE = [
  'occName',
  'dispatcherEmail',
  'dutyManagerEmail',
  'dutyManagerPhone',
  'occWebhookUrl',
  'notifyFrom',
  'smsEnabled',
  'emailEnabled',
  'highRiskThreshold',
  'escalationDelta',
  'defaultIntervalMinutes',
];

/** GET /api/settings/alerts */
exports.getAlertSettings = async (req, res) => {
  try {
    const settings = await escalationEngine.settingsFor(req.user.id);
    res.json({ success: true, data: settings, readiness: readiness(settings) });
  } catch (error) {
    console.error('Get alert settings failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not load alert settings.' });
  }
};

/** PUT /api/settings/alerts */
exports.updateAlertSettings = async (req, res) => {
  try {
    const settings = await escalationEngine.settingsFor(req.user.id);

    for (const field of EDITABLE) {
      if (req.body[field] !== undefined) {
        settings[field] = req.body[field] === '' ? null : req.body[field];
      }
    }

    await settings.save();
    res.json({ success: true, data: settings, readiness: readiness(settings) });
  } catch (error) {
    if (error.name === 'ValidationError') {
      return res.status(400).json({ success: false, error: error.message });
    }
    console.error('Update alert settings failed:', error.message);
    res.status(500).json({ success: false, error: 'Could not save alert settings.' });
  }
};

/**
 * POST /api/settings/alerts/test — fires a realistic alert down every
 * configured channel using a clearly-labelled drill incident.
 *
 * An escalation path that has never been exercised is not a path.
 */
exports.testAlertRouting = async (req, res) => {
  try {
    const settings = await escalationEngine.settingsFor(req.user.id);

    const drill = {
      reference: 'INC-DRILL',
      severity: req.body.severity && Object.values(SEVERITY).includes(req.body.severity)
        ? req.body.severity
        : SEVERITY.EMERGENCY,
      flightNumber: 'TEST001',
      route: 'Bengaluru → Dubai',
      flightPhase: 'landing',
      riskProbability: 0.82,
      peakProbability: 0.82,
      lastTriggeredAt: new Date(),
      summary: 'ROUTING TEST — not a real flight.',
      triggeredRules: [
        {
          code: 'ROUTING_TEST',
          kind: 'primary',
          label: 'This is a routing test',
          detail: 'Sent manually from alert settings to verify the escalation path. No aircraft is affected.',
        },
      ],
      contributingFactors: [],
    };

    const notifications = await notificationService.dispatch(drill, settings);

    res.json({
      success: true,
      data: {
        notifications,
        delivered: notifications.filter((n) => n.status === 'sent').length,
        attempted: notifications.length,
      },
    });
  } catch (error) {
    console.error('Alert routing test failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
};

/**
 * POST /api/settings/alerts/verify-smtp — opens and closes an SMTP connection
 * without sending anything.
 *
 * Separate from the drill on purpose: this proves the mailbox authenticates,
 * which is the thing that actually breaks with Gmail App Passwords, and it
 * costs nothing against the daily send quota.
 */
exports.verifySmtp = async (req, res) => {
  const result = await sendEmail.verify();

  res.status(result.ok ? 200 : 400).json({
    success: result.ok,
    data: result.ok
      ? { host: result.host, port: result.port, mailbox: result.user }
      : null,
    error: result.ok ? null : result.error,
  });
};

/**
 * Which escalation channels would actually reach someone right now. Surfaced in
 * the UI so an operator can see the gap before an incident finds it for them.
 */
function readiness(settings) {
  return {
    dispatcher: Boolean(settings.emailEnabled && settings.dispatcherEmail),
    dutyManagerEmail: Boolean(settings.emailEnabled && settings.dutyManagerEmail),
    dutyManagerSms: Boolean(settings.smsEnabled && settings.dutyManagerPhone),
    occWebhook: Boolean(settings.occWebhookUrl),
    smsGatewayConfigured: Boolean(
      process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN && process.env.TWILIO_FROM_NUMBER
    ),
    emailGatewayConfigured: sendEmail.isConfigured(),
  };
}

module.exports.readiness = readiness;

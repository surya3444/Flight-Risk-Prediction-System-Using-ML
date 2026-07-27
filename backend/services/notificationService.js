const axios = require('axios');
const sendEmail = require('../utils/sendEmail');
const { ROUTING, isAtLeast } = require('../config/riskPolicy');
const { subjectFor, textBody, htmlBody, smsBody } = require('./alertTemplates');

/**
 * Fans an incident out to the people who can act on it.
 *
 * Two rules govern everything here:
 *
 *  1. A channel that is not configured is *skipped*, never an error — the
 *     system must keep monitoring when the SMS gateway has no credentials.
 *  2. Every attempt is recorded with its outcome. A failed page is more
 *     important to log than a successful one.
 */

const TWILIO_SID = process.env.TWILIO_ACCOUNT_SID;
const TWILIO_TOKEN = process.env.TWILIO_AUTH_TOKEN;
const TWILIO_FROM = process.env.TWILIO_FROM_NUMBER;

async function sendSms(to, body) {
  if (!TWILIO_SID || !TWILIO_TOKEN || !TWILIO_FROM) {
    throw new Error('SMS gateway not configured (TWILIO_* env vars missing)');
  }

  // Twilio's REST API over plain HTTP — no extra dependency for one endpoint.
  const params = new URLSearchParams({ To: to, From: TWILIO_FROM, Body: body });
  await axios.post(
    `https://api.twilio.com/2010-04-01/Accounts/${TWILIO_SID}/Messages.json`,
    params.toString(),
    {
      auth: { username: TWILIO_SID, password: TWILIO_TOKEN },
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      timeout: 10000,
    }
  );
}

async function postWebhook(url, incident) {
  await axios.post(
    url,
    {
      type: 'flight_risk_incident',
      reference: incident.reference,
      severity: incident.severity,
      flightNumber: incident.flightNumber,
      route: incident.route,
      flightPhase: incident.flightPhase,
      riskProbability: incident.riskProbability,
      peakProbability: incident.peakProbability,
      triggeredRules: incident.triggeredRules,
      contributingFactors: incident.contributingFactors,
      summary: incident.summary,
      raisedAt: incident.lastTriggeredAt,
    },
    { timeout: 10000, headers: { 'Content-Type': 'application/json' } }
  );
}

/**
 * @returns {Promise<Array>} one record per attempted channel, shaped for
 *                           Incident.notifications
 */
async function dispatch(incident, settings) {
  const routing = ROUTING[incident.severity];
  const results = [];

  if (!routing || !routing.channels.length) {
    return [{ channel: 'log', status: 'skipped', detail: 'Watch-tier event — logged only', at: new Date() }];
  }

  // The operator's floor. Below it, nothing is sent but the incident still
  // exists on the board.
  if (!isAtLeast(incident.severity, settings.notifyFrom)) {
    return [
      {
        channel: 'log',
        status: 'skipped',
        detail: `Below the configured notification floor (${settings.notifyFrom})`,
        at: new Date(),
      },
    ];
  }

  const context = { occName: settings.occName || 'Operations Control Centre' };
  const subject = subjectFor(incident);

  const emailTargets = {
    dispatcher: { address: settings.dispatcherEmail, role: 'Dispatcher' },
    dutyManager: { address: settings.dutyManagerEmail, role: 'Duty Manager' },
  };

  for (const channel of routing.channels) {
    const record = { channel, status: 'skipped', target: null, detail: null, at: new Date() };

    try {
      if (channel === 'dispatcher' || channel === 'dutyManager') {
        const { address, role } = emailTargets[channel];
        record.target = address;

        if (!settings.emailEnabled) {
          record.detail = 'Email delivery disabled in alert settings';
        } else if (!address) {
          record.detail = `No ${role.toLowerCase()} email configured`;
        } else {
          const ctx = { ...context, recipientRole: role };
          await sendEmail(address, subject, textBody(incident, ctx), htmlBody(incident, ctx));
          record.status = 'sent';
          record.detail = `${role} notified by email`;
        }
      } else if (channel === 'dutyManagerSms') {
        record.target = settings.dutyManagerPhone;

        if (!settings.smsEnabled) {
          record.detail = 'SMS paging disabled in alert settings';
        } else if (!settings.dutyManagerPhone) {
          record.detail = 'No duty manager phone number configured';
        } else {
          await sendSms(settings.dutyManagerPhone, smsBody(incident));
          record.status = 'sent';
          record.detail = 'Duty manager paged by SMS';
        }
      } else if (channel === 'occWebhook') {
        record.target = settings.occWebhookUrl;

        if (!settings.occWebhookUrl) {
          record.detail = 'No OCC webhook configured — incident is on the internal board only';
        } else {
          await postWebhook(settings.occWebhookUrl, incident);
          record.status = 'sent';
          record.detail = 'OCC feed updated';
        }
      }
    } catch (error) {
      record.status = 'failed';
      record.detail = error.message;
      console.error(`[alert] ${incident.reference} channel=${channel} FAILED: ${error.message}`);
    }

    results.push(record);
  }

  return results;
}

module.exports = { dispatch, sendSms };

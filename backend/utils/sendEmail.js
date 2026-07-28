const nodemailer = require('nodemailer');

/**
 * Email delivery over Gmail's SMTP relay.
 *
 * Gmail is the right call here precisely because there is no owned domain yet:
 * it sends from a real, already-verified mailbox, so alerts do not land in spam
 * the way mail from an unauthenticated custom domain does.
 *
 * Two things it demands in return:
 *
 *  1. An **App Password**, not the account password. Google stopped accepting
 *     account passwords for SMTP in May 2022. Generate one at
 *     https://myaccount.google.com/apppasswords (requires 2-Step Verification).
 *  2. A send quota — roughly 500 recipients/day on a free account. Fine for an
 *     operations centre; not a bulk channel.
 *
 * Port 587 with STARTTLS is the default. 465 (implicit TLS) is selected
 * automatically if you set it, since the two need opposite `secure` flags and
 * getting that pair wrong is the usual cause of a silent hang.
 */

const HOST = process.env.SMTP_HOST || 'smtp.gmail.com';
const PORT = Number(process.env.SMTP_PORT || 587);
const USER = process.env.GMAIL_USER;
const PASS = process.env.GMAIL_APP_PASSWORD;

// Display name only — Gmail rewrites the envelope address to the authenticated
// mailbox regardless of what we put here, so the address part must be the
// account itself or the header and envelope disagree.
const FROM_NAME = process.env.MAIL_FROM_NAME || 'AeroSafe OCC';

// Built on first use rather than at import time, so a server with no mail
// credentials still boots and keeps monitoring — a missing key degrades one
// channel, it does not take the process down.
let transporter = null;

function getTransporter() {
  if (!USER || !PASS) {
    throw new Error(
      'Gmail SMTP is not configured (set GMAIL_USER and GMAIL_APP_PASSWORD)'
    );
  }

  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: HOST,
      port: PORT,
      // 465 is implicit TLS; 587 starts plaintext and upgrades via STARTTLS.
      secure: PORT === 465,
      auth: { user: USER, pass: PASS },
      // Without these, a dead network stalls a monitoring cycle indefinitely.
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 15000,
    });
  }

  return transporter;
}

/** Turns Gmail's terse SMTP codes into something an operator can act on. */
function explain(error) {
  const code = error.responseCode || error.code;

  if (code === 535 || code === 534) {
    return (
      'Gmail rejected the credentials. Use a 16-character App Password from ' +
      'https://myaccount.google.com/apppasswords — not your account password — ' +
      'and make sure 2-Step Verification is on.'
    );
  }
  if (code === 'EAUTH') return `Gmail authentication failed: ${error.message}`;
  if (code === 'ETIMEDOUT' || code === 'ESOCKET' || code === 'ECONNECTION') {
    return `Could not reach ${HOST}:${PORT} — the network or the port is blocked.`;
  }
  if (code === 550 || code === 552) return `Gmail refused the message: ${error.message}`;
  if (code === 421 || code === 454) {
    return 'Gmail is rate-limiting this account. Free accounts allow roughly 500 recipients per day.';
  }
  return error.message;
}

/**
 * Sends a transactional email.
 *
 * @param {string} email   recipient
 * @param {string} subject
 * @param {string} text    plain-text body (always sent — some OCC terminals are text-only)
 * @param {string} [html]  optional rich body
 */
const sendEmail = async (email, subject, text, html) => {
  try {
    const info = await getTransporter().sendMail({
      from: `"${FROM_NAME}" <${USER}>`,
      // Replies go to a human, not to the sending mailbox.
      replyTo: process.env.MAIL_REPLY_TO || USER,
      to: email,
      subject,
      text,
      ...(html ? { html } : {}),
    });

    console.log(`Email sent to ${email} (${info.messageId})`);
    return info;
  } catch (error) {
    const message = explain(error);
    console.error(`Gmail SMTP error sending to ${email}: ${message}`);
    throw new Error(message);
  }
};

/**
 * Opens and closes an SMTP connection without sending anything.
 * Backs the readiness check so a misconfigured mailbox is caught before an
 * incident finds it.
 */
sendEmail.verify = async () => {
  try {
    await getTransporter().verify();
    return { ok: true, host: HOST, port: PORT, user: USER };
  } catch (error) {
    return { ok: false, error: explain(error) };
  }
};

sendEmail.isConfigured = () => Boolean(USER && PASS);

module.exports = sendEmail;

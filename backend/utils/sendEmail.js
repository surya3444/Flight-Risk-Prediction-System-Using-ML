const { Resend } = require('resend');

const FROM = process.env.MAIL_FROM || 'AeroSafe OCC <onboarding@resend.dev>';

// Built on first use, not at import time: the Resend constructor throws when
// the key is missing, and a missing email key must degrade one channel, not
// take the whole server down at startup.
let client = null;

function getClient() {
  if (!process.env.RESEND_API_KEY) {
    throw new Error('RESEND_API_KEY is not configured');
  }
  if (!client) client = new Resend(process.env.RESEND_API_KEY);
  return client;
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
  const { data, error } = await getClient().emails.send({
    from: FROM,
    to: email,
    subject,
    text,
    ...(html ? { html } : {}),
  });

  if (error) {
    console.error('Resend API Error:', error);
    throw new Error(error.message || 'Email could not be sent');
  }

  console.log('Email sent to:', email);
  return data;
};

module.exports = sendEmail;

/**
 * SMS gateway abstraction. SMS_PROVIDER=console (default) logs the message and records it in
 * `sentMessages` (useful for tests). A real provider (for example a Bangladesh bulk-SMS API)
 * can be added by extending `providers`.
 */
const env = require('../config/env');

const sentMessages = [];

const providers = {
  async console({ to, text }) {
    sentMessages.push({ to, text, at: new Date() });
    if (env.nodeEnv !== 'test') console.log(`[sms:console] -> ${to}: ${text}`);
    return { ok: true };
  },
  async http({ to, text }) {
    const res = await fetch(env.smsApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${env.smsApiKey}` },
      body: JSON.stringify({ to, message: text, sender: env.smsSenderId }),
    });
    return { ok: res.ok };
  },
};

async function sendSms(to, text) {
  if (!to) return { ok: false, reason: 'no phone' };
  const provider = providers[env.smsProvider] || providers.console;
  try {
    return await provider({ to, text });
  } catch (err) {
    return { ok: false, reason: err.message };
  }
}

module.exports = { sendSms, sentMessages };

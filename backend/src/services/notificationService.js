const { Notification } = require('../models/Notification');
const { User } = require('../models/User');
const { sendSms } = require('./smsService');

/**
 * Create an in-app notification and optionally mirror it as an SMS.
 * Never throws: notification failures must not break the business action.
 */
async function notify(userId, { type = 'system', title, body = '', link = '', sms = false }) {
  try {
    const doc = await Notification.create({ user: userId, type, title, body, link });
    if (sms) {
      const user = await User.findById(userId).select('phone');
      const result = await sendSms(user?.phone, `${title}${body ? ` - ${body}` : ''}`.slice(0, 160));
      doc.smsStatus = result.ok ? 'sent' : 'failed';
      await doc.save();
    }
    return doc;
  } catch (err) {
    console.error('notify failed:', err.message);
    return null;
  }
}

module.exports = { notify };

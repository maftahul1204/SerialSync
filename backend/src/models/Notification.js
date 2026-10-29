const mongoose = require('mongoose');

const NOTIFICATION_TYPES = [
  'booking_confirmed',
  'booking_cancelled',
  'queue_turn_soon',
  'queue_delay',
  'order_update',
  'report_ready',
  'doctor_approval',
  'system',
];

const notificationSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    type: { type: String, enum: NOTIFICATION_TYPES, default: 'system' },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    body: { type: String, trim: true, maxlength: 400, default: '' },
    link: { type: String, trim: true, maxlength: 200, default: '' },
    readAt: { type: Date, default: null },
    smsStatus: { type: String, enum: ['none', 'sent', 'failed'], default: 'none' },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

notificationSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    type: this.type,
    title: this.title,
    body: this.body,
    link: this.link,
    read: Boolean(this.readAt),
    smsStatus: this.smsStatus,
    createdAt: this.createdAt,
  };
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = { Notification, NOTIFICATION_TYPES };

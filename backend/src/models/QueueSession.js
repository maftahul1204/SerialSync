const mongoose = require('mongoose');

const SESSION_STATUSES = ['active', 'paused', 'closed'];

const queueSessionSchema = new mongoose.Schema(
  {
    doctor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    chamber: { type: mongoose.Schema.Types.ObjectId, ref: 'Chamber', required: true, index: true },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
      index: true,
    },
    status: { type: String, enum: SESSION_STATUSES, default: 'active' },
    servingIndex: { type: Number, default: -1 },
    delayMinutes: { type: Number, default: 0, min: 0 },
    delayReason: { type: String, trim: true, maxlength: 200, default: '' },
    pauseMessage: { type: String, trim: true, maxlength: 200, default: '' },
    undo: {
      bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'SlotBooking' },
      previousStatus: { type: String },
      expiresAt: { type: Date },
    },
  },
  { timestamps: true }
);

queueSessionSchema.index({ chamber: 1, date: 1 }, { unique: true });

const QueueSession = mongoose.model('QueueSession', queueSessionSchema);

module.exports = { QueueSession, SESSION_STATUSES };

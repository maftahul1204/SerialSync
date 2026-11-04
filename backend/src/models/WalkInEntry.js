const mongoose = require('mongoose');

const WALKIN_PRIORITIES = ['urgent', 'emergency'];
const WALKIN_STATUSES = ['waiting', 'serving', 'completed', 'no_show'];

const walkInSchema = new mongoose.Schema(
  {
    session: { type: mongoose.Schema.Types.ObjectId, ref: 'QueueSession', required: true, index: true },
    afterSerial: { type: Number, required: true, min: 1 },
    subSuffix: { type: String, default: 'B', maxlength: 2 },
    displayLabel: { type: String, required: true, trim: true, maxlength: 12 },
    patientName: { type: String, required: true, trim: true, maxlength: 120 },
    priority: { type: String, enum: WALKIN_PRIORITIES, default: 'urgent' },
    reason: { type: String, trim: true, maxlength: 300, default: '' },
    status: { type: String, enum: WALKIN_STATUSES, default: 'waiting' },
  },
  { timestamps: true }
);

const WalkInEntry = mongoose.model('WalkInEntry', walkInSchema);

module.exports = { WalkInEntry, WALKIN_PRIORITIES, WALKIN_STATUSES };

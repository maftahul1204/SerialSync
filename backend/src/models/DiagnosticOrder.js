const mongoose = require('mongoose');

const ORDER_STATUSES = [
  'pending_dispatch',
  'assigned',
  'en_route',
  'sample_collected',
  'lab_received',
  'under_analysis',
  'completed',
  'cancelled',
];

const lineItemSchema = new mongoose.Schema(
  {
    testId: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticTest' },
    code: String,
    name: String,
    price: Number,
  },
  { _id: false }
);

const resultSchema = new mongoose.Schema(
  {
    code: { type: String, trim: true, uppercase: true },
    name: { type: String, trim: true },
    value: { type: Number, required: true },
    unit: { type: String, trim: true, default: '' },
    refLow: { type: Number },
    refHigh: { type: Number },
    flag: { type: String, enum: ['normal', 'low', 'high', 'critical'], default: 'normal' },
  },
  { _id: false }
);

const diagnosticOrderSchema = new mongoose.Schema(
  {
    patient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    center: { type: mongoose.Schema.Types.ObjectId, ref: 'DiagnosticCenter', index: true },
    centerName: { type: String, trim: true, default: '' },
    centerArea: { type: String, trim: true, default: '' },
    centerPhone: { type: String, trim: true, default: '' },
    subtotal: { type: Number, min: 0, default: 0 },
    discount: { type: Number, min: 0, default: 0 },
    collectionFee: { type: Number, min: 0, default: 0 },
    statusHistory: {
      type: [{ status: String, at: { type: Date, default: Date.now }, note: { type: String, default: '' }, _id: false }],
      default: [],
    },
    phlebotomist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', index: true },
    tests: { type: [lineItemSchema], required: true, validate: [(v) => v.length > 0, 'At least one test'] },
    packageName: { type: String, trim: true, maxlength: 120 },
    address: { type: String, required: true, trim: true, maxlength: 400 },
    contactPhone: { type: String, required: true, trim: true, maxlength: 20 },
    preferredDate: { type: String, required: true, match: [/^\d{4}-\d{2}-\d{2}$/] },
    timeSlot: { type: String, required: true, trim: true, maxlength: 20 },
    status: { type: String, enum: ORDER_STATUSES, default: 'pending_dispatch', index: true },
    barcodeId: { type: String, trim: true, maxlength: 64, index: true },
    totalAmount: { type: Number, required: true, min: 0 },
    reportFileName: { type: String, trim: true },
    reportSha256: { type: String, trim: true },
    criticalFlags: { type: [String], default: [] },
    results: { type: [resultSchema], default: [] },
    reportedAt: { type: Date },
    sharedDoctorIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    etaMinutes: { type: Number, min: 0 },
    collectionNote: { type: String, trim: true, maxlength: 300 },
  },
  { timestamps: true }
);

diagnosticOrderSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    patientId: this.patient?.toString?.() || this.patient,
    phlebotomistId: this.phlebotomist?.toString?.() || this.phlebotomist || null,
    tests: this.tests,
    packageName: this.packageName || '',
    address: this.address,
    contactPhone: this.contactPhone,
    preferredDate: this.preferredDate,
    timeSlot: this.timeSlot,
    status: this.status,
    barcodeId: this.barcodeId || '',
    totalAmount: this.totalAmount,
    subtotal: this.subtotal || this.totalAmount,
    discount: this.discount || 0,
    collectionFee: this.collectionFee || 0,
    center: this.center
      ? { id: this.center.toString(), name: this.centerName, area: this.centerArea, phone: this.centerPhone }
      : null,
    statusHistory: (this.statusHistory || []).map((h) => ({ status: h.status, at: h.at, note: h.note })),
    reportAvailable: Boolean(this.reportFileName && this.reportSha256),
    criticalFlags: this.criticalFlags || [],
    results: (this.results || []).map((r) => ({
      code: r.code, name: r.name, value: r.value, unit: r.unit, refLow: r.refLow, refHigh: r.refHigh, flag: r.flag,
    })),
    reportedAt: this.reportedAt || null,
    sharedDoctorIds: (this.sharedDoctorIds || []).map((id) => id.toString()),
    etaMinutes: this.etaMinutes ?? null,
    collectionNote: this.collectionNote || '',
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

const DiagnosticOrder = mongoose.model('DiagnosticOrder', diagnosticOrderSchema);

module.exports = { DiagnosticOrder, ORDER_STATUSES };

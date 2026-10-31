const mongoose = require('mongoose');

const priceSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, uppercase: true, trim: true },
    price: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const diagnosticCenterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 120, unique: true },
    area: { type: String, trim: true, maxlength: 80, default: '' },
    city: { type: String, trim: true, maxlength: 80, default: 'Dhaka' },
    address: { type: String, trim: true, maxlength: 240, default: '' },
    phone: { type: String, trim: true, maxlength: 20, default: '' },
    accreditation: { type: String, trim: true, maxlength: 80, default: '' },
    rating: { type: Number, min: 0, max: 5, default: 4.5 },
    reviewsCount: { type: Number, min: 0, default: 0 },
    openFrom: { type: String, match: [/^\d{2}:\d{2}$/, 'openFrom must be HH:mm'], default: '08:00' },
    openTo: { type: String, match: [/^\d{2}:\d{2}$/, 'openTo must be HH:mm'], default: '20:00' },
    openDays: { type: [Number], default: [0, 1, 2, 3, 4, 5, 6] },
    turnaroundHours: { type: Number, min: 1, default: 24 },
    homeCollection: { type: Boolean, default: true },
    collectionFee: { type: Number, min: 0, default: 100 },
    freeCollectionAbove: { type: Number, min: 0, default: 1500 },
    acceptingOrders: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    prices: { type: [priceSchema], default: [] },
  },
  { timestamps: true }
);

/** Is the center open at `now` according to its weekly hours? */
diagnosticCenterSchema.methods.isOpenAt = function isOpenAt(now = new Date()) {
  if (!this.openDays.includes(now.getDay())) return false;
  const mins = now.getHours() * 60 + now.getMinutes();
  const [fh, fm] = this.openFrom.split(':').map(Number);
  const [th, tm] = this.openTo.split(':').map(Number);
  return mins >= fh * 60 + fm && mins < th * 60 + tm;
};

diagnosticCenterSchema.methods.priceFor = function priceFor(code) {
  const row = this.prices.find((p) => p.code === String(code).toUpperCase());
  return row ? row.price : null;
};

diagnosticCenterSchema.methods.toPublicJSON = function toPublicJSON(now = new Date()) {
  return {
    id: this._id.toString(),
    name: this.name,
    area: this.area,
    city: this.city,
    address: this.address,
    phone: this.phone,
    accreditation: this.accreditation,
    rating: this.rating,
    reviewsCount: this.reviewsCount,
    openFrom: this.openFrom,
    openTo: this.openTo,
    openDays: this.openDays,
    openNow: this.isActive && this.acceptingOrders && this.isOpenAt(now),
    turnaroundHours: this.turnaroundHours,
    homeCollection: this.homeCollection,
    collectionFee: this.collectionFee,
    freeCollectionAbove: this.freeCollectionAbove,
    acceptingOrders: this.acceptingOrders,
    isActive: this.isActive,
    testsOffered: this.prices.length,
  };
};

const DiagnosticCenter = mongoose.model('DiagnosticCenter', diagnosticCenterSchema);

module.exports = { DiagnosticCenter };

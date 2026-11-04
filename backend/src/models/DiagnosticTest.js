const mongoose = require('mongoose');

const diagnosticTestSchema = new mongoose.Schema(
  {
    code: { type: String, required: true, unique: true, trim: true, uppercase: true },
    name: { type: String, required: true, trim: true, maxlength: 120 },
    category: { type: String, required: true, trim: true, maxlength: 80, index: true },
    price: { type: Number, required: true, min: 0 },
    fastingRequired: { type: Boolean, default: false },
    tubeType: { type: String, trim: true, maxlength: 40, default: '' },
    preparation: { type: String, trim: true, maxlength: 500, default: '' },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

diagnosticTestSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    code: this.code,
    name: this.name,
    category: this.category,
    price: this.price,
    fastingRequired: this.fastingRequired,
    tubeType: this.tubeType,
    preparation: this.preparation,
  };
};

const DiagnosticTest = mongoose.model('DiagnosticTest', diagnosticTestSchema);

module.exports = { DiagnosticTest };

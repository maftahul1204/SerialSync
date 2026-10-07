const mongoose = require('mongoose');

const chamberSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Chamber name is required'],
      trim: true,
      maxlength: 120,
    },
    address: {
      type: String,
      trim: true,
      maxlength: 300,
    },
    city: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    area: {
      type: String,
      trim: true,
      maxlength: 80,
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

chamberSchema.index({ doctor: 1, name: 1 }, { unique: true });

chamberSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    name: this.name,
    address: this.address || '',
    city: this.city || '',
    area: this.area || '',
    phone: this.phone || '',
    isActive: this.isActive,
  };
};

const Chamber = mongoose.model('Chamber', chamberSchema);

module.exports = { Chamber };

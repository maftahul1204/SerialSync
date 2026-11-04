const mongoose = require('mongoose');

const RELATIONS = ['spouse', 'child', 'parent', 'sibling', 'other'];

const familyMemberSchema = new mongoose.Schema(
  {
    owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    fullName: { type: String, required: true, trim: true, maxlength: 120 },
    relation: { type: String, enum: RELATIONS, required: true },
    gender: { type: String, enum: ['male', 'female', 'other'], default: 'other' },
    age: { type: Number, min: 0, max: 120 },
    phone: { type: String, trim: true, maxlength: 20 },
    bloodGroup: { type: String, trim: true, maxlength: 4 },
  },
  { timestamps: true }
);

familyMemberSchema.methods.toPublicJSON = function toPublicJSON() {
  return {
    id: this._id.toString(),
    fullName: this.fullName,
    relation: this.relation,
    gender: this.gender,
    age: this.age ?? null,
    phone: this.phone || '',
    bloodGroup: this.bloodGroup || '',
  };
};

const FamilyMember = mongoose.model('FamilyMember', familyMemberSchema);

module.exports = { FamilyMember, RELATIONS };

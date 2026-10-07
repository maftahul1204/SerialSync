const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const validator = require('validator');

const ROLES = ['patient', 'doctor', 'assistant', 'phlebotomist', 'admin'];
const DOCTOR_APPROVAL_STATUSES = ['pending', 'approved', 'rejected'];

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: [true, 'Full name is required'],
      trim: true,
      maxlength: 120,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      validate: [validator.isEmail, 'Invalid email address'],
    },
    phone: {
      type: String,
      trim: true,
      maxlength: 20,
    },
    passwordHash: {
      type: String,
      required: true,
      select: false,
    },
    role: {
      type: String,
      enum: ROLES,
      default: 'patient',
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    doctorApprovalStatus: {
      type: String,
      enum: DOCTOR_APPROVAL_STATUSES,
      default: undefined,
    },
    doctorProfile: {
      specialtyTitle: { type: String, trim: true, maxlength: 80 },
      specialtySlug: { type: String, trim: true, maxlength: 40 },
      affiliations: { type: String, trim: true, maxlength: 200 },
      roomLabel: { type: String, trim: true, maxlength: 80 },
      rating: { type: Number, min: 0, max: 5, default: 4.8 },
      avatarUrl: { type: String, trim: true, maxlength: 500 },
      isOnline: { type: Boolean, default: true },
    },
    passwordResetTokenHash: { type: String, select: false },
    passwordResetExpires: { type: Date, select: false },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function comparePassword(plain) {
  return bcrypt.compare(plain, this.passwordHash);
};

userSchema.statics.hashPassword = async function hashPassword(plain) {
  return bcrypt.hash(plain, 12);
};

userSchema.methods.toSafeJSON = function toSafeJSON() {
  const base = {
    id: this._id.toString(),
    fullName: this.fullName,
    email: this.email,
    phone: this.phone || '',
    role: this.role,
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
  if (this.role === 'doctor') {
    base.doctorApprovalStatus = this.doctorApprovalStatus || 'pending';
  }
  if (this.role === 'doctor' && this.doctorProfile) {
    base.doctorProfile = {
      specialtyTitle: this.doctorProfile.specialtyTitle || '',
      specialtySlug: this.doctorProfile.specialtySlug || '',
      affiliations: this.doctorProfile.affiliations || '',
      roomLabel: this.doctorProfile.roomLabel || '',
      rating: this.doctorProfile.rating ?? 4.8,
      avatarUrl: this.doctorProfile.avatarUrl || '',
      isOnline: this.doctorProfile.isOnline !== false,
    };
  }
  return base;
};

const User = mongoose.model('User', userSchema);

module.exports = { User, ROLES, DOCTOR_APPROVAL_STATUSES };

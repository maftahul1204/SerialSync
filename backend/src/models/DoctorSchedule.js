const mongoose = require('mongoose');

const SCHEDULE_STATUSES = ['active', 'inactive'];

const doctorScheduleSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    chamber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chamber',
      required: true,
    },
    daysOfWeek: {
      type: [Number],
      validate: {
        validator(days) {
          return Array.isArray(days) && days.length > 0 && days.every((d) => d >= 0 && d <= 6);
        },
        message: 'daysOfWeek must be integers 0 (Sun) through 6 (Sat)',
      },
      required: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'startTime must be HH:mm'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'endTime must be HH:mm'],
    },
    slotDurationMinutes: {
      type: Number,
      default: 15,
      min: 5,
      max: 120,
    },
    consultationFee: {
      type: Number,
      required: [true, 'Consultation fee is required'],
      min: 0,
    },
    patientsPerSlot: {
      type: Number,
      default: 1,
      min: 1,
      max: 50,
    },
    status: {
      type: String,
      enum: SCHEDULE_STATUSES,
      default: 'active',
      index: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { timestamps: true }
);

doctorScheduleSchema.methods.toPublicJSON = function toPublicJSON(chamberDoc) {
  const chamber = chamberDoc || this.chamber;
  const chamberJson =
    chamber && typeof chamber === 'object' && chamber.name
      ? chamber.toPublicJSON?.() || {
          id: chamber._id?.toString(),
          name: chamber.name,
          address: chamber.address,
          city: chamber.city,
        }
      : { id: this.chamber?.toString() };

  return {
    id: this._id.toString(),
    doctorId: this.doctor.toString(),
    chamber: chamberJson,
    daysOfWeek: this.daysOfWeek,
    startTime: this.startTime,
    endTime: this.endTime,
    slotDurationMinutes: this.slotDurationMinutes,
    consultationFee: this.consultationFee,
    patientsPerSlot: this.patientsPerSlot,
    status: this.status,
    notes: this.notes || '',
    updatedAt: this.updatedAt,
  };
};

const DoctorSchedule = mongoose.model('DoctorSchedule', doctorScheduleSchema);

module.exports = { DoctorSchedule, SCHEDULE_STATUSES };

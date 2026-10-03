const mongoose = require('mongoose');

const slotBookingSchema = new mongoose.Schema(
  {
    doctor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    schedule: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'DoctorSchedule',
      required: true,
    },
    chamber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chamber',
      required: true,
    },
    date: {
      type: String,
      required: true,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'date must be YYYY-MM-DD'],
    },
    slotStart: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'slotStart must be HH:mm'],
    },
    slotEnd: {
      type: String,
      required: true,
      match: [/^\d{2}:\d{2}$/, 'slotEnd must be HH:mm'],
    },
    patient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

slotBookingSchema.index({ schedule: 1, date: 1, slotStart: 1 });
slotBookingSchema.index({ doctor: 1, date: 1, slotStart: 1 });

const SlotBooking = mongoose.model('SlotBooking', slotBookingSchema);

module.exports = { SlotBooking };

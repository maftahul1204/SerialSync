const mongoose = require('mongoose');
const { SlotBooking } = require('../models/SlotBooking');
const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { toAppointmentJSON } = require('../services/appointmentMapper');
const {
  validateStatusTransition,
  canPatientCancel,
} = require('../utils/bookingValidation');

async function hydrateAppointment(doc) {
  const [doctor, chamber, schedule] = await Promise.all([
    User.findById(doc.doctor),
    Chamber.findById(doc.chamber),
    DoctorSchedule.findById(doc.schedule),
  ]);
  return toAppointmentJSON(doc, { doctor, chamber, schedule });
}

async function listMyAppointments(req, res, next) {
  try {
    const status = req.query.status;
    const query = { patient: req.user._id };
    if (status) query.status = status;

    const rows = await SlotBooking.find(query).sort({ date: -1, slotStart: -1 }).limit(100);
    const appointments = await Promise.all(rows.map((row) => hydrateAppointment(row)));
    return res.json({ success: true, appointments });
  } catch (err) {
    next(err);
  }
}

async function getAppointment(req, res, next) {
  try {
    const doc = await SlotBooking.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const isOwner = doc.patient.toString() === req.user._id.toString();
    const isStaff =
      req.user.role === 'admin' ||
      (req.user.role === 'doctor' && doc.doctor.toString() === req.user._id.toString());
    if (!isOwner && !isStaff) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const appointment = await hydrateAppointment(doc);
    return res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
}

async function cancelAppointment(req, res, next) {
  try {
    const doc = await SlotBooking.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const isOwner = doc.patient.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';
    if (!isOwner && !isAdmin) {
      return res.status(403).json({ success: false, message: 'Only the patient or admin can cancel' });
    }
    if (!canPatientCancel(doc.status)) {
      return res.status(400).json({ success: false, message: 'This appointment cannot be cancelled' });
    }
    doc.status = 'cancelled';
    await doc.save();
    const appointment = await hydrateAppointment(doc);
    return res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
}

async function updateAppointmentStatus(req, res, next) {
  try {
    const { status } = req.body;
    const doc = await SlotBooking.findById(req.params.id);
    if (!doc) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    const isDoctorOwner =
      req.user.role === 'doctor' && doc.doctor.toString() === req.user._id.toString();
    if (req.user.role !== 'admin' && !isDoctorOwner) {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const transitionError = validateStatusTransition(doc.status, status);
    if (transitionError) {
      return res.status(400).json({ success: false, message: transitionError });
    }
    doc.status = status;
    await doc.save();
    const appointment = await hydrateAppointment(doc);
    return res.json({ success: true, appointment });
  } catch (err) {
    next(err);
  }
}

async function listDoctorDayAppointments(req, res, next) {
  try {
    const { date } = req.query;
    if (!date) {
      return res.status(400).json({ success: false, message: 'date query (YYYY-MM-DD) is required' });
    }
    const doctorId = req.user.role === 'admin' && req.query.doctorId
      ? req.query.doctorId
      : req.user._id.toString();
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const rows = await SlotBooking.find({
      doctor: doctorId,
      date,
      status: { $ne: 'cancelled' },
    }).sort({ serialNumber: 1 });
    const appointments = await Promise.all(rows.map((row) => hydrateAppointment(row)));
    return res.json({ success: true, date, appointments });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listMyAppointments,
  getAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  listDoctorDayAppointments,
};

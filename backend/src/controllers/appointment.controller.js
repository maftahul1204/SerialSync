const mongoose = require('mongoose');
const { SlotBooking } = require('../models/SlotBooking');
const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { QueueSession } = require('../models/QueueSession');
const { WalkInEntry } = require('../models/WalkInEntry');
const { notify } = require('../services/notificationService');
const { cancelBookings } = require('../services/cancellationService');
const { parsePagination, pageMeta } = require('../utils/pagination');
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

    const pg = parsePagination(req.query, { defaultLimit: 50 });
    const [rows, total] = await Promise.all([
      SlotBooking.find(query).sort({ date: -1, slotStart: -1 }).skip(pg.skip).limit(pg.limit),
      SlotBooking.countDocuments(query),
    ]);
    const appointments = await Promise.all(rows.map((row) => hydrateAppointment(row)));
    return res.json({ success: true, appointments, pagination: pageMeta(pg, total) });
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
    const reason = typeof req.body?.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
    await cancelBookings([doc], { by: isOwner ? 'patient' : 'admin', reason });
    const appointment = await hydrateAppointment(doc);
    await notify(doc.doctor, {
      type: 'booking_cancelled',
      title: `Serial #${doc.serialNumber} cancelled by the patient`,
      body: `${doc.date} at ${doc.slotStart} is open again${reason ? `. Reason: ${reason}` : '.'}`,
      link: '/dashboard',
    });
    await notify(doc.patient, {
      type: 'booking_cancelled',
      title: `Serial #${doc.serialNumber} cancelled`,
      body: `Your booking on ${doc.date} at ${doc.slotStart} was cancelled and the slot released.`,
      link: '/bookings',
      sms: true,
    });
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
    if (status === 'cancelled') {
      const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
      if (reason.length < 3) {
        return res.status(400).json({ success: false, message: 'Please give a reason for cancelling this appointment' });
      }
      await cancelBookings([doc], { by: isDoctorOwner ? 'doctor' : 'admin', reason });
      return res.json({ success: true, appointment: await hydrateAppointment(doc) });
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

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** FR-15: end-of-day summary for a doctor (counts, walk-ins, collected fees). */
async function doctorDaySummary(req, res, next) {
  try {
    const { date } = req.query;
    if (!date || !DATE_RE.test(date)) {
      return res.status(400).json({ success: false, message: 'date query (YYYY-MM-DD) is required' });
    }
    const doctorId =
      req.user.role === 'admin' && req.query.doctorId ? req.query.doctorId : req.user._id.toString();
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const rows = await SlotBooking.find({ doctor: doctorId, date });
    const schedules = await DoctorSchedule.find({ _id: { $in: rows.map((r) => r.schedule) } }).select(
      'consultationFee'
    );
    const feeBySchedule = new Map(schedules.map((s) => [s._id.toString(), s.consultationFee || 0]));

    const counts = { booked: 0, confirmed: 0, completed: 0, cancelled: 0, no_show: 0 };
    let feesCollected = 0;
    let feesExpected = 0;
    const byChamber = new Map();
    for (const r of rows) {
      counts[r.status] = (counts[r.status] || 0) + 1;
      const fee = feeBySchedule.get(r.schedule.toString()) || 0;
      if (r.status === 'completed') feesCollected += fee;
      if (r.status !== 'cancelled') feesExpected += fee;
      const key = r.chamber.toString();
      byChamber.set(key, (byChamber.get(key) || 0) + (r.status === 'cancelled' ? 0 : 1));
    }

    const sessions = await QueueSession.find({ doctor: doctorId, date }).select('_id');
    const walkIns = await WalkInEntry.countDocuments({ session: { $in: sessions.map((s) => s._id) } });
    const chambers = await Chamber.find({ _id: { $in: [...byChamber.keys()] } }).select('name');
    const chamberName = new Map(chambers.map((c) => [c._id.toString(), c.name]));

    const total = rows.length - counts.cancelled;
    return res.json({
      success: true,
      date,
      summary: {
        totalBooked: total,
        completed: counts.completed,
        noShow: counts.no_show,
        cancelled: counts.cancelled,
        pending: counts.booked + counts.confirmed,
        walkIns,
        feesCollected,
        feesExpected,
        completionRate: total ? Math.round((counts.completed / total) * 100) : 0,
        chambers: [...byChamber.entries()].map(([id, patients]) => ({
          chamberId: id,
          name: chamberName.get(id) || 'Chamber',
          patients,
        })),
      },
    });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  doctorDaySummary,
  listMyAppointments,
  getAppointment,
  cancelAppointment,
  updateAppointmentStatus,
  listDoctorDayAppointments,
};

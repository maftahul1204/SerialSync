const mongoose = require('mongoose');
const { User } = require('../models/User');
const { isDoctorListedPublicly } = require('../middleware/doctorApproval');
const { nextSerialForDoctorDay, buildConfirmationCode } = require('../utils/appointmentSerial');
const { validateBookingRequest } = require('../utils/bookingValidation');
const { toAppointmentJSON } = require('../services/appointmentMapper');
const { Chamber } = require('../models/Chamber');
const { DoctorSchedule, SCHEDULE_STATUSES } = require('../models/DoctorSchedule');
const { SlotBooking } = require('../models/SlotBooking');
const { FamilyMember } = require('../models/FamilyMember');
const { notify } = require('../services/notificationService');
const {
  cancelBookings,
  cancelOrphanedBookings,
  futureBookingsForSchedule,
  todayYmd,
} = require('../services/cancellationService');
const { findScheduleConflicts } = require('../utils/scheduleConflict');
const { normalizeDays, validateNewAvailability } = require('../utils/availabilityValidation');
const { validateTimeRange } = require('../utils/scheduleTime');
const {
  generateSlotsForScheduleOnDate,
  eachDateInRange,
  applyBookingCounts,
} = require('../utils/appointmentSlots');

async function assertDoctorChamber(doctorId, chamberId) {
  const chamber = await Chamber.findOne({ _id: chamberId, doctor: doctorId, isActive: true });
  return chamber;
}

async function createSchedule(req, res, next) {
  try {
    const parsed = validateNewAvailability(req.body);
    if (!parsed.ok) {
      return res.status(parsed.status).json({ success: false, message: parsed.message });
    }
    const {
      chamberId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      consultationFee,
      patientsPerSlot,
      notes,
    } = parsed.data;

    const chamber = await assertDoctorChamber(req.user._id, chamberId);
    if (!chamber) {
      return res.status(404).json({ success: false, message: 'Chamber not found for this doctor' });
    }

    const candidate = { daysOfWeek, startTime, endTime };
    const conflicts = await findScheduleConflicts(req.user._id, candidate);
    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: 'That time overlaps another schedule you already have',
        conflicts,
      });
    }

    const schedule = await DoctorSchedule.create({
      doctor: req.user._id,
      chamber: chamberId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      consultationFee,
      patientsPerSlot,
      notes,
      status: 'active',
    });
    await schedule.populate('chamber');
    return res.status(201).json({
      success: true,
      schedule: schedule.toPublicJSON(schedule.chamber),
    });
  } catch (err) {
    next(err);
  }
}

async function updateSchedule(req, res, next) {
  try {
    const schedule = await DoctorSchedule.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    const nextDays = req.body.daysOfWeek !== undefined ? normalizeDays(req.body.daysOfWeek) : schedule.daysOfWeek;
    if (req.body.daysOfWeek !== undefined && !nextDays?.length) {
      return res.status(400).json({ success: false, message: 'Invalid daysOfWeek' });
    }

    const startTime = req.body.startTime ?? schedule.startTime;
    const endTime = req.body.endTime ?? schedule.endTime;
    const rangeError = validateTimeRange(startTime, endTime);
    if (rangeError) {
      return res.status(400).json({ success: false, message: rangeError });
    }

    if (req.body.chamberId) {
      const chamber = await assertDoctorChamber(req.user._id, req.body.chamberId);
      if (!chamber) {
        return res.status(404).json({ success: false, message: 'Chamber not found for this doctor' });
      }
      schedule.chamber = req.body.chamberId;
    }

    const candidate = {
      daysOfWeek: nextDays,
      startTime,
      endTime,
    };
    const conflicts = await findScheduleConflicts(req.user._id, candidate, schedule._id);
    if (conflicts.length) {
      return res.status(409).json({
        success: false,
        message: 'That time overlaps another schedule you already have',
        conflicts,
      });
    }

    schedule.daysOfWeek = nextDays;
    schedule.startTime = startTime;
    schedule.endTime = endTime;
    if (req.body.slotDurationMinutes !== undefined) {
      schedule.slotDurationMinutes = req.body.slotDurationMinutes;
    }
    if (req.body.consultationFee !== undefined) {
      schedule.consultationFee = req.body.consultationFee;
    }
    if (req.body.patientsPerSlot !== undefined) {
      schedule.patientsPerSlot = req.body.patientsPerSlot;
    }
    if (req.body.notes !== undefined) {
      schedule.notes = req.body.notes;
    }

    await schedule.save();
    const cancelledBookings = await cancelOrphanedBookings(schedule, {
      reason: 'The doctor changed this chamber schedule',
    });
    await schedule.populate('chamber');
    return res.json({ success: true, schedule: schedule.toPublicJSON(schedule.chamber), cancelledBookings });
  } catch (err) {
    next(err);
  }
}

async function deleteSchedule(req, res, next) {
  try {
    const schedule = await DoctorSchedule.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }
    const affected = await futureBookingsForSchedule(schedule._id);
    const cancelledBookings = await cancelBookings(affected, {
      by: 'doctor',
      reason: 'The doctor removed this chamber schedule',
      doctor: req.user,
    });
    await DoctorSchedule.deleteOne({ _id: schedule._id });
    return res.json({ success: true, message: 'Availability removed', cancelledBookings });
  } catch (err) {
    next(err);
  }
}

async function updateScheduleStatus(req, res, next) {
  try {
    const { status } = req.body;
    if (!SCHEDULE_STATUSES.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `status must be one of: ${SCHEDULE_STATUSES.join(', ')}`,
      });
    }

    const schedule = await DoctorSchedule.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!schedule) {
      return res.status(404).json({ success: false, message: 'Schedule not found' });
    }

    if (status === 'active') {
      const conflicts = await findScheduleConflicts(
        req.user._id,
        {
          daysOfWeek: schedule.daysOfWeek,
          startTime: schedule.startTime,
          endTime: schedule.endTime,
        },
        schedule._id
      );
      if (conflicts.length) {
        return res.status(409).json({
          success: false,
          message: 'Cannot turn this back on — it overlaps another active block',
          conflicts,
        });
      }
    }

    schedule.status = status;
    await schedule.save();
    const cancelledBookings =
      status === 'inactive'
        ? await cancelBookings(await futureBookingsForSchedule(schedule._id), {
            by: 'doctor',
            reason: 'The doctor paused this chamber schedule',
            doctor: req.user,
          })
        : 0;
    await schedule.populate('chamber');
    return res.json({ success: true, schedule: schedule.toPublicJSON(schedule.chamber), cancelledBookings });
  } catch (err) {
    next(err);
  }
}

async function listMySchedules(req, res, next) {
  try {
    const schedules = await DoctorSchedule.find({ doctor: req.user._id })
      .populate('chamber')
      .sort({ updatedAt: -1 });
    return res.json({
      success: true,
      schedules: schedules.map((s) => s.toPublicJSON(s.chamber)),
    });
  } catch (err) {
    next(err);
  }
}

async function getDoctorPublicSchedules(req, res, next) {
  try {
    const { doctorId } = req.params;
    if (!mongoose.Types.ObjectId.isValid(doctorId)) {
      return res.status(400).json({ success: false, message: 'Invalid doctor id' });
    }
    const doctor = await User.findById(doctorId);
    if (!isDoctorListedPublicly(doctor)) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const schedules = await DoctorSchedule.find({ doctor: doctorId, status: 'active' })
      .populate('chamber')
      .sort({ startTime: 1 });

    const chambers = await Chamber.find({ doctor: doctorId, isActive: true }).sort({ name: 1 });

    return res.json({
      success: true,
      doctor: {
        id: doctor._id.toString(),
        fullName: doctor.fullName,
      },
      chambers: chambers.map((c) => c.toPublicJSON()),
      schedules: schedules
        .filter((s) => s.chamber?.isActive !== false)
        .map((s) => s.toPublicJSON(s.chamber)),
    });
  } catch (err) {
    next(err);
  }
}

async function getDoctorAppointmentSlots(req, res, next) {
  try {
    const { doctorId } = req.params;
    const { from, to } = req.query;
    if (!from || !to) {
      return res.status(400).json({ success: false, message: 'from and to query params (YYYY-MM-DD) are required' });
    }

    const doctor = await User.findById(doctorId);
    if (!isDoctorListedPublicly(doctor)) {
      return res.status(404).json({ success: false, message: 'Doctor not found' });
    }

    const schedules = await DoctorSchedule.find({ doctor: doctorId, status: 'active' }).lean();
    const dates = eachDateInRange(from, to);
    let slots = [];

    for (const date of dates) {
      for (const schedule of schedules) {
        slots = slots.concat(generateSlotsForScheduleOnDate(schedule, date));
      }
    }

    const bookings = await SlotBooking.find({
      doctor: doctorId,
      date: { $gte: from, $lte: to },
    }).lean();

    slots = applyBookingCounts(slots, bookings);
    slots = slots.filter((s) => s.status !== 'full' || s.bookedCount > 0);

    return res.json({ success: true, from, to, slots });
  } catch (err) {
    next(err);
  }
}

async function bookAppointmentSlot(req, res, next) {
  try {
    const { scheduleId, date, slotStart, patientNote, familyMemberId } = req.body;
    const validationError = validateBookingRequest({ scheduleId, date, slotStart });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const schedule = await DoctorSchedule.findById(scheduleId);
    if (!schedule || schedule.status !== 'active') {
      return res.status(404).json({ success: false, message: 'Schedule not available' });
    }

    const scheduleDoctor = await User.findById(schedule.doctor);
    if (!isDoctorListedPublicly(scheduleDoctor)) {
      return res.status(403).json({ success: false, message: 'This doctor is not available for booking' });
    }

    if ((schedule.closedDates || []).some((c) => c.date === date)) {
      return res.status(409).json({
        success: false,
        code: 'DOCTOR_UNAVAILABLE',
        message: 'The doctor is not seeing patients on this date. Please choose another day.',
      });
    }

    const daySlots = generateSlotsForScheduleOnDate(schedule, date);
    const match = daySlots.find((s) => s.slotStart === slotStart);
    if (!match) {
      return res.status(400).json({ success: false, message: 'Invalid slot for this schedule and date' });
    }

    let familyMember = null;
    if (familyMemberId) {
      if (!mongoose.Types.ObjectId.isValid(familyMemberId)) {
        return res.status(400).json({ success: false, message: 'Invalid familyMemberId' });
      }
      familyMember = await FamilyMember.findOne({ _id: familyMemberId, owner: req.user._id });
      if (!familyMember) {
        return res.status(404).json({ success: false, message: 'Family member not found' });
      }
    }

    const duplicate = await SlotBooking.findOne({
      patient: req.user._id,
      familyMember: familyMember ? familyMember._id : null,
      schedule: scheduleId,
      date,
      slotStart,
      status: { $ne: 'cancelled' },
    });
    if (duplicate) {
      return res.status(409).json({ success: false, message: 'You already booked this slot' });
    }

    const existingCount = await SlotBooking.countDocuments({
      schedule: scheduleId,
      date,
      slotStart,
      status: { $ne: 'cancelled' },
    });
    if (existingCount >= schedule.patientsPerSlot) {
      return res.status(409).json({ success: false, message: 'This slot is full' });
    }

    const serialNumber = await nextSerialForDoctorDay(schedule.doctor, date);
    const booking = await SlotBooking.create({
      doctor: schedule.doctor,
      schedule: scheduleId,
      chamber: schedule.chamber,
      date,
      slotStart: match.slotStart,
      slotEnd: match.slotEnd,
      patient: req.user._id,
      serialNumber,
      status: 'confirmed',
      confirmationCode: buildConfirmationCode(),
      familyMember: familyMember ? familyMember._id : null,
      bookedForName: familyMember ? familyMember.fullName : '',
      patientNote: patientNote ? String(patientNote).trim().slice(0, 300) : '',
    });

    const [doctor, chamber] = await Promise.all([
      User.findById(schedule.doctor),
      Chamber.findById(schedule.chamber),
    ]);
    const appointment = await toAppointmentJSON(booking, { doctor, chamber, schedule });

    const who = familyMember ? ` for ${familyMember.fullName}` : '';
    await notify(req.user._id, {
      type: 'booking_confirmed',
      title: `Serial #${serialNumber} confirmed${who}`,
      body: `${doctor?.fullName || 'Doctor'} on ${date} at ${match.slotStart}. Code ${booking.confirmationCode}.`,
      link: `/bookings/${booking._id}`,
      sms: true,
    });
    await notify(schedule.doctor, {
      type: 'system',
      title: 'New serial booked',
      body: `Serial #${serialNumber} on ${date} at ${match.slotStart}.`,
      link: '/dashboard',
    });

    return res.status(201).json({
      success: true,
      appointment,
    });
  } catch (err) {
    next(err);
  }
}

/** Doctor cancels one chamber day: closes the date, cancels and notifies every booked patient. */
async function cancelScheduleDay(req, res, next) {
  try {
    const { date } = req.body;
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim().slice(0, 300) : '';
    if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      return res.status(400).json({ success: false, message: 'date must be YYYY-MM-DD' });
    }
    if (reason.length < 3) {
      return res.status(400).json({ success: false, message: 'Please give a reason so patients understand' });
    }
    if (date < todayYmd()) {
      return res.status(400).json({ success: false, message: 'You cannot cancel a day that has already passed' });
    }
    const schedule = await DoctorSchedule.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    if (!generateSlotsForScheduleOnDate({ ...schedule.toObject(), closedDates: [] }, date).length) {
      return res.status(400).json({ success: false, message: 'This schedule does not run on that date' });
    }
    if ((schedule.closedDates || []).some((c) => c.date === date)) {
      return res.status(409).json({ success: false, message: 'That day is already cancelled' });
    }

    schedule.closedDates.push({ date, reason });
    await schedule.save();
    const affected = await futureBookingsForSchedule(schedule._id, date, { date });
    const cancelledBookings = await cancelBookings(affected, { by: 'doctor', reason, doctor: req.user });
    return res.json({ success: true, date, cancelledBookings, closedDates: schedule.closedDates });
  } catch (err) {
    next(err);
  }
}

async function reopenScheduleDay(req, res, next) {
  try {
    const { date } = req.params;
    const schedule = await DoctorSchedule.findOne({ _id: req.params.id, doctor: req.user._id });
    if (!schedule) return res.status(404).json({ success: false, message: 'Schedule not found' });
    const before = schedule.closedDates.length;
    schedule.closedDates = schedule.closedDates.filter((c) => c.date !== date);
    if (schedule.closedDates.length === before) {
      return res.status(404).json({ success: false, message: 'That day is not cancelled' });
    }
    await schedule.save();
    return res.json({ success: true, closedDates: schedule.closedDates });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  cancelScheduleDay,
  reopenScheduleDay,
  createSchedule,
  updateSchedule,
  deleteSchedule,
  updateScheduleStatus,
  listMySchedules,
  getDoctorPublicSchedules,
  getDoctorAppointmentSlots,
  bookAppointmentSlot,
};

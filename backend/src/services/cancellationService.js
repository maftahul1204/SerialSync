const { SlotBooking } = require('../models/SlotBooking');
const { DoctorSchedule } = require('../models/DoctorSchedule');
const { Chamber } = require('../models/Chamber');
const { User } = require('../models/User');
const { QueueSession } = require('../models/QueueSession');
const { notify } = require('./notificationService');
const { getSessionState } = require('./queueService');
const { generateSlotsForScheduleOnDate, eachDateInRange, applyBookingCounts } = require('../utils/appointmentSlots');
const { formatDateYmd } = require('../utils/scheduleTime');
const { getIo } = require('../realtime/socket');

const ACTIVE_STATUSES = ['booked', 'confirmed'];
const SEARCH_DAYS = 21;

function todayYmd() {
  return formatDateYmd(new Date());
}

function addDays(ymd, n) {
  const [y, m, d] = ymd.split('-').map(Number);
  return formatDateYmd(new Date(y, m - 1, d + n));
}

/**
 * First open slot for a doctor from `fromYmd` onward (looks SEARCH_DAYS ahead). Used to tell a
 * patient where to rebook after a cancellation.
 */
async function nextAvailableSlot(doctorId, fromYmd = todayYmd(), { excludeDate, excludeScheduleId } = {}) {
  const schedules = await DoctorSchedule.find({ doctor: doctorId, status: 'active' }).lean();
  const usable = schedules.filter((s) => !excludeScheduleId || s._id.toString() !== String(excludeScheduleId));
  if (!usable.length) return null;
  const to = addDays(fromYmd, SEARCH_DAYS);
  const bookings = await SlotBooking.find({ doctor: doctorId, date: { $gte: fromYmd, $lte: to } }).lean();
  for (const date of eachDateInRange(fromYmd, to)) {
    if (excludeDate && date === excludeDate) continue;
    let slots = [];
    for (const s of usable) slots = slots.concat(generateSlotsForScheduleOnDate(s, date));
    slots = applyBookingCounts(slots, bookings).filter((s) => s.remaining > 0);
    if (slots.length) {
      slots.sort((a, b) => a.slotStart.localeCompare(b.slotStart));
      const pick = slots[0];
      const sched = usable.find((s) => s._id.toString() === pick.scheduleId);
      const chamber = sched ? await Chamber.findById(sched.chamber).select('name') : null;
      return { date: pick.date, slotStart: pick.slotStart, slotEnd: pick.slotEnd, scheduleId: pick.scheduleId, chamberName: chamber?.name || '' };
    }
  }
  return null;
}

function describeSlot(slot) {
  if (!slot) return 'No open slot in the next 3 weeks yet; please check back soon.';
  return `Next available: ${slot.date} ${slot.slotStart}${slot.chamberName ? ` at ${slot.chamberName}` : ''}.`;
}

/** Push the new queue state to patients/assistants watching that chamber-day. */
async function refreshQueueFor(booking) {
  try {
    const session = await QueueSession.findOne({ chamber: booking.chamber, date: booking.date });
    if (!session) return;
    const state = await getSessionState(session._id);
    const io = getIo();
    if (io && state) io.to(`queue:${session._id}`).emit('queue_updated', state);
  } catch (err) {
    console.error('queue refresh failed:', err.message);
  }
}

/**
 * Cancel bookings, record who/why, tell every affected patient (in-app + SMS) where to rebook, and
 * refresh live queues. `by` is patient | doctor | admin | system.
 */
async function cancelBookings(bookings, { by, reason, doctor }) {
  const doc = doctor || (bookings[0] ? await User.findById(bookings[0].doctor).select('fullName') : null);
  const suggestionCache = new Map();
  let cancelled = 0;
  for (const b of bookings) {
    if (!ACTIVE_STATUSES.includes(b.status)) continue;
    b.status = 'cancelled';
    b.cancelledBy = by;
    b.cancelReason = reason || '';
    b.cancelledAt = new Date();
    await b.save();
    cancelled += 1;
    await refreshQueueFor(b);

    if (by !== 'patient') {
      const key = `${b.doctor}|${b.date}`;
      if (!suggestionCache.has(key)) {
        suggestionCache.set(key, await nextAvailableSlot(b.doctor, todayYmd(), { excludeDate: b.date }));
      }
      const suggestion = suggestionCache.get(key);
      await notify(b.patient, {
        type: 'booking_cancelled',
        title: `Serial #${b.serialNumber} on ${b.date} was cancelled`,
        body: `${doc?.fullName || 'The doctor'} cancelled${reason ? `: ${reason}` : '.'} ${describeSlot(suggestion)}`,
        link: `/doctors/${b.doctor}/schedule`,
        sms: true,
      });
    }
  }
  return cancelled;
}

/** Active bookings of a schedule from `fromYmd` on (default: today). */
function futureBookingsForSchedule(scheduleId, fromYmd = todayYmd(), extra = {}) {
  return SlotBooking.find({ schedule: scheduleId, date: { $gte: fromYmd }, status: { $in: ACTIVE_STATUSES }, ...extra });
}

/** After a schedule edit: cancel future bookings whose slot no longer exists in the new schedule. */
async function cancelOrphanedBookings(schedule, { reason }) {
  const bookings = await futureBookingsForSchedule(schedule._id);
  const orphaned = bookings.filter((b) => {
    if ((schedule.closedDates || []).some((c) => c.date === b.date)) return false; // handled by closure
    const slots = schedule.status === 'active' ? generateSlotsForScheduleOnDate(schedule, b.date) : [];
    return !slots.some((s) => s.slotStart === b.slotStart);
  });
  return cancelBookings(orphaned, { by: 'doctor', reason });
}

module.exports = {
  todayYmd,
  nextAvailableSlot,
  describeSlot,
  cancelBookings,
  cancelOrphanedBookings,
  futureBookingsForSchedule,
  refreshQueueFor,
  ACTIVE_STATUSES,
};

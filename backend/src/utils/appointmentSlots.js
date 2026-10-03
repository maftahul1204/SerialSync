const { timeToMinutes, minutesToTime, dayOfWeekForYmd, parseYmd, formatDateYmd } = require('./scheduleTime');

function generateSlotsForScheduleOnDate(schedule, dateYmd) {
  const dow = dayOfWeekForYmd(dateYmd);
  if (!schedule.daysOfWeek.includes(dow)) {
    return [];
  }

  const duration = schedule.slotDurationMinutes || 15;
  let cursor = timeToMinutes(schedule.startTime);
  const end = timeToMinutes(schedule.endTime);
  const slots = [];

  while (cursor + duration <= end) {
    const slotStart = minutesToTime(cursor);
    const slotEnd = minutesToTime(cursor + duration);
    slots.push({
      scheduleId: schedule._id?.toString() || schedule.id,
      date: dateYmd,
      slotStart,
      slotEnd,
      consultationFee: schedule.consultationFee,
      capacity: schedule.patientsPerSlot,
      bookedCount: 0,
      remaining: schedule.patientsPerSlot,
      status: 'available',
    });
    cursor += duration;
  }

  return slots;
}

function eachDateInRange(fromYmd, toYmd) {
  const dates = [];
  let current = parseYmd(fromYmd);
  const end = parseYmd(toYmd);
  while (current <= end) {
    dates.push(formatDateYmd(current));
    current = new Date(current.getFullYear(), current.getMonth(), current.getDate() + 1);
  }
  return dates;
}

function applyBookingCounts(slots, bookings) {
  const counts = new Map();
  for (const b of bookings) {
    const key = `${b.schedule.toString()}|${b.date}|${b.slotStart}`;
    counts.set(key, (counts.get(key) || 0) + 1);
  }

  return slots.map((slot) => {
    const key = `${slot.scheduleId}|${slot.date}|${slot.slotStart}`;
    const bookedCount = counts.get(key) || 0;
    const remaining = Math.max(0, slot.capacity - bookedCount);
    let status = 'available';
    if (remaining === 0) {
      status = 'full';
    }
    return { ...slot, bookedCount, remaining, status };
  });
}

module.exports = {
  generateSlotsForScheduleOnDate,
  eachDateInRange,
  applyBookingCounts,
};

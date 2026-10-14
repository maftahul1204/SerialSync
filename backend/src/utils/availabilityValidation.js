const { validateTimeRange } = require('./scheduleTime');

function normalizeDays(daysOfWeek) {
  if (!Array.isArray(daysOfWeek)) return null;
  const unique = [...new Set(daysOfWeek.map(Number))].sort((a, b) => a - b);
  if (unique.some((d) => d < 0 || d > 6)) return null;
  return unique;
}

function validateNewAvailability(body) {
  const daysOfWeek = normalizeDays(body.daysOfWeek);
  const {
    chamberId,
    startTime,
    endTime,
    slotDurationMinutes,
    consultationFee,
    patientsPerSlot,
    notes,
  } = body;

  if (!chamberId || !daysOfWeek?.length || !startTime || !endTime) {
    return {
      ok: false,
      status: 400,
      message: 'chamberId, daysOfWeek, startTime, and endTime are required',
    };
  }

  const rangeError = validateTimeRange(startTime, endTime);
  if (rangeError) {
    return { ok: false, status: 400, message: rangeError };
  }

  if (consultationFee === undefined || consultationFee === null) {
    return { ok: false, status: 400, message: 'consultationFee is required' };
  }

  const fee = Number(consultationFee);
  if (Number.isNaN(fee) || fee < 0) {
    return { ok: false, status: 400, message: 'consultationFee must be a non-negative number' };
  }

  if (slotDurationMinutes === undefined || slotDurationMinutes === null || slotDurationMinutes === '') {
    return {
      ok: false,
      status: 400,
      message: 'slotDurationMinutes is required (minutes per patient serial)',
    };
  }
  const duration = Number(slotDurationMinutes);
  if (Number.isNaN(duration) || duration < 5 || duration > 120) {
    return {
      ok: false,
      status: 400,
      message: 'slotDurationMinutes must be between 5 and 120',
    };
  }

  const capacity = patientsPerSlot === undefined || patientsPerSlot === null ? 1 : Number(patientsPerSlot);
  if (Number.isNaN(capacity) || capacity < 1 || capacity > 50) {
    return { ok: false, status: 400, message: 'patientsPerSlot must be between 1 and 50' };
  }

  return {
    ok: true,
    data: {
      chamberId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes: duration,
      consultationFee: fee,
      patientsPerSlot: capacity,
      notes,
    },
  };
}

module.exports = { normalizeDays, validateNewAvailability };

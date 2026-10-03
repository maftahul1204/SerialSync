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

  return {
    ok: true,
    data: {
      chamberId,
      daysOfWeek,
      startTime,
      endTime,
      slotDurationMinutes,
      consultationFee: fee,
      patientsPerSlot,
      notes,
    },
  };
}

module.exports = { normalizeDays, validateNewAvailability };

const APPOINTMENT_STATUSES = ['booked', 'confirmed', 'cancelled', 'completed', 'no_show'];

function validateBookingRequest({ scheduleId, date, slotStart }) {
  if (!scheduleId) return 'scheduleId is required';
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return 'date must be YYYY-MM-DD';
  if (!slotStart || !/^\d{2}:\d{2}$/.test(slotStart)) return 'slotStart must be HH:mm';
  return null;
}

function validateStatusTransition(current, next) {
  if (!APPOINTMENT_STATUSES.includes(next)) {
    return `status must be one of: ${APPOINTMENT_STATUSES.join(', ')}`;
  }
  if (current === 'cancelled') return 'Cancelled appointments cannot change status';
  if (current === 'completed' && next !== 'completed') return 'Completed appointments are final';
  return null;
}

function canPatientCancel(status) {
  return status === 'booked' || status === 'confirmed';
}

module.exports = {
  APPOINTMENT_STATUSES,
  validateBookingRequest,
  validateStatusTransition,
  canPatientCancel,
};

const TIME_RE = /^\d{2}:\d{2}$/;

export function validateCreateAvailability(form) {
  if (!form.chamberId) return 'Pick a chamber first';
  if (!form.daysOfWeek?.length) return 'Select at least one weekday';
  if (!TIME_RE.test(form.startTime || '') || !TIME_RE.test(form.endTime || '')) {
    return 'Use HH:mm for start and end time';
  }
  const [sh, sm] = form.startTime.split(':').map(Number);
  const [eh, em] = form.endTime.split(':').map(Number);
  if (eh * 60 + em <= sh * 60 + sm) return 'End time has to be after start time';
  if (form.consultationFee === '' || form.consultationFee === null) return 'Fee is required';
  const fee = Number(form.consultationFee);
  if (Number.isNaN(fee) || fee < 0) return 'Fee must be zero or more';
  return null;
}

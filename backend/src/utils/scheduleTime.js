function timeToMinutes(time) {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function minutesToTime(total) {
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function validateTimeRange(startTime, endTime) {
  const start = timeToMinutes(startTime);
  const end = timeToMinutes(endTime);
  if (end <= start) {
    return 'End time must be after start time';
  }
  return null;
}

function rangesOverlap(startA, endA, startB, endB) {
  const a0 = timeToMinutes(startA);
  const a1 = timeToMinutes(endA);
  const b0 = timeToMinutes(startB);
  const b1 = timeToMinutes(endB);
  return a0 < b1 && b0 < a1;
}

function daysOverlap(daysA, daysB) {
  const setB = new Set(daysB);
  return daysA.some((d) => setB.has(d));
}

function formatDateYmd(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseYmd(ymd) {
  const [y, m, d] = ymd.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function dayOfWeekForYmd(ymd) {
  return parseYmd(ymd).getDay();
}

module.exports = {
  timeToMinutes,
  minutesToTime,
  validateTimeRange,
  rangesOverlap,
  daysOverlap,
  formatDateYmd,
  parseYmd,
  dayOfWeekForYmd,
};

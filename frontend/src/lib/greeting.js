export function timeGreeting(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function patientDisplayId(userId) {
  if (!userId) return '#SS-00000';
  const tail = userId.replace(/[^a-f0-9]/gi, '').slice(-5).toUpperCase();
  return `#SS-${tail.padStart(5, '0')}`;
}

export function validateBookingNote(note) {
  if (!note) return null;
  if (String(note).length > 300) return 'Note must be 300 characters or less';
  return null;
}

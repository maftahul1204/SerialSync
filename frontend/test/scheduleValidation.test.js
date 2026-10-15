const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCreateAvailability } = require('../src/lib/scheduleValidation');

test('validateCreateAvailability requires minutes per patient', () => {
  const base = {
    chamberId: 'abc',
    daysOfWeek: [1],
    startTime: '09:00',
    endTime: '10:00',
    consultationFee: '500',
    patientsPerSlot: 1,
  };
  assert.ok(validateCreateAvailability({ ...base, slotDurationMinutes: '' }));
  assert.equal(validateCreateAvailability({ ...base, slotDurationMinutes: 12 }), null);
});

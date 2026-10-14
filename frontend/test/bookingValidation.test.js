const { test } = require('node:test');
const assert = require('node:assert/strict');
const { validateBookingNote } = require('../src/lib/bookingValidation');

test('booking note length is capped', () => {
  assert.equal(validateBookingNote('ok'), null);
  assert.ok(validateBookingNote('x'.repeat(301)));
});

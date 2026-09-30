const test = require('node:test');
const assert = require('node:assert/strict');
const {
  validateEmail,
  validatePassword,
  validateLogin,
  validateRegistration,
} = require('../src/lib/validation.js');

test('validateEmail rejects empty and invalid addresses', () => {
  assert.ok(validateEmail(''));
  assert.ok(validateEmail('not-an-email'));
  assert.equal(validateEmail('user@serialsync.test'), null);
});

test('validatePassword enforces minimum length', () => {
  assert.ok(validatePassword('short'));
  assert.equal(validatePassword('longenough'), null);
});

test('validateLogin combines field checks', () => {
  assert.ok(validateLogin({ email: '', password: 'longenough' }));
  assert.equal(validateLogin({ email: 'a@b.co', password: 'longenough' }), null);
});

test('validateRegistration requires full name', () => {
  assert.ok(validateRegistration({ fullName: ' ', email: 'a@b.co', password: 'longenough' }));
  assert.equal(
    validateRegistration({ fullName: 'Fahim', email: 'a@b.co', password: 'longenough' }),
    null
  );
});

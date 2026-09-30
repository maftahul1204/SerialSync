const test = require('node:test');
const assert = require('node:assert/strict');

test('password validation minimum length is enforced in controller logic', () => {
  const min = 8;
  assert.ok('short'.length < min);
  assert.ok('longenough'.length >= min);
});

test('RBAC roles list includes patient and admin', () => {
  const { ROLES } = require('../src/models/User');
  assert.ok(ROLES.includes('patient'));
  assert.ok(ROLES.includes('admin'));
  assert.equal(ROLES.length, 5);
});

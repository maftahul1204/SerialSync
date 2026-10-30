const { atomicIncr } = require('../config/redis');

async function nextSerialForDoctorDay(doctorId, dateYmd) {
  const key = `serial:${doctorId}:${dateYmd}`;
  return atomicIncr(key);
}

function buildConfirmationCode() {
  return `SS-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

module.exports = { nextSerialForDoctorDay, buildConfirmationCode };

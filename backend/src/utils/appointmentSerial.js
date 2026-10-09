const { SlotBooking } = require('../models/SlotBooking');

async function nextSerialForDoctorDay(doctorId, dateYmd) {
  const last = await SlotBooking.findOne({
    doctor: doctorId,
    date: dateYmd,
    status: { $ne: 'cancelled' },
  })
    .sort({ serialNumber: -1 })
    .select('serialNumber')
    .lean();

  return (last?.serialNumber || 0) + 1;
}

function buildConfirmationCode() {
  return `SS-${Date.now().toString(36).toUpperCase().slice(-8)}`;
}

module.exports = { nextSerialForDoctorDay, buildConfirmationCode };

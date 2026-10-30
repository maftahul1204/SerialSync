const QRCode = require('qrcode');
const { SlotBooking } = require('../models/SlotBooking');
const { User } = require('../models/User');
const { Chamber } = require('../models/Chamber');

async function getAppointmentQr(req, res, next) {
  try {
    const doc = await SlotBooking.findById(req.params.id);
    if (!doc) return res.status(404).json({ success: false, message: 'Appointment not found' });
    const isOwner = doc.patient.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Insufficient permissions' });
    }
    const [doctor, chamber] = await Promise.all([
      User.findById(doc.doctor),
      Chamber.findById(doc.chamber),
    ]);
    const payload = {
      appointmentId: doc._id.toString(),
      confirmationCode: doc.confirmationCode,
      serialNumber: doc.serialNumber,
      date: doc.date,
      patientId: doc.patient.toString(),
      doctorName: doctor?.fullName || '',
      chamber: chamber?.name || '',
    };
    const dataUrl = await QRCode.toDataURL(JSON.stringify(payload), {
      width: 300,
      margin: 1,
      errorCorrectionLevel: 'M',
    });
    return res.json({ success: true, qrDataUrl: dataUrl, payload });
  } catch (err) {
    next(err);
  }
}

module.exports = { getAppointmentQr };

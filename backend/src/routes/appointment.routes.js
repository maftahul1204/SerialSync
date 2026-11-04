const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const appointmentController = require('../controllers/appointment.controller');
const { getAppointmentQr } = require('../controllers/appointmentQr.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/me', requireRole('patient', 'admin'), appointmentController.listMyAppointments);
router.get('/doctor/day', requireRole('doctor', 'admin'), appointmentController.listDoctorDayAppointments);
router.get('/doctor/summary', requireRole('doctor', 'admin'), appointmentController.doctorDaySummary);
router.get('/:id/qr', getAppointmentQr);
router.get('/:id', appointmentController.getAppointment);
router.post('/:id/cancel', requireRole('patient', 'admin'), appointmentController.cancelAppointment);
router.patch('/:id/status', requireRole('doctor', 'admin'), appointmentController.updateAppointmentStatus);

module.exports = router;

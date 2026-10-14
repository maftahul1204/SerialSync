const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const appointmentController = require('../controllers/appointment.controller');

const router = express.Router();

router.use(requireAuth);

router.get('/me', requireRole('patient', 'admin'), appointmentController.listMyAppointments);
router.get('/doctor/day', requireRole('doctor', 'admin'), appointmentController.listDoctorDayAppointments);
router.get('/:id', appointmentController.getAppointment);
router.post('/:id/cancel', requireRole('patient', 'admin'), appointmentController.cancelAppointment);
router.patch('/:id/status', requireRole('doctor', 'admin'), appointmentController.updateAppointmentStatus);

module.exports = router;

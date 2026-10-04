const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const scheduleController = require('../controllers/schedule.controller');

const router = express.Router();

router.get('/doctors/:doctorId', scheduleController.getDoctorPublicSchedules);
router.get('/doctors/:doctorId/slots', scheduleController.getDoctorAppointmentSlots);

router.use(requireAuth);

router.get('/me', requireRole('doctor', 'admin'), scheduleController.listMySchedules);
router.post('/', requireRole('doctor', 'admin'), scheduleController.createSchedule);
router.patch('/:id', requireRole('doctor', 'admin'), scheduleController.updateSchedule);
router.delete('/:id', requireRole('doctor', 'admin'), scheduleController.deleteSchedule);
router.patch('/:id/status', requireRole('doctor', 'admin'), scheduleController.updateScheduleStatus);
router.post('/slots/book', requireRole('patient', 'admin'), scheduleController.bookAppointmentSlot);

module.exports = router;

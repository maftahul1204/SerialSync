const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const { requireApprovedDoctor } = require('../middleware/doctorApproval');
const scheduleController = require('../controllers/schedule.controller');

const router = express.Router();

router.get('/doctors/:doctorId', scheduleController.getDoctorPublicSchedules);
router.get('/doctors/:doctorId/slots', scheduleController.getDoctorAppointmentSlots);

router.use(requireAuth);

router.get('/me', requireRole('doctor', 'admin'), requireApprovedDoctor, scheduleController.listMySchedules);
router.post('/', requireRole('doctor', 'admin'), requireApprovedDoctor, scheduleController.createSchedule);
router.patch('/:id', requireRole('doctor', 'admin'), requireApprovedDoctor, scheduleController.updateSchedule);
router.delete('/:id', requireRole('doctor', 'admin'), requireApprovedDoctor, scheduleController.deleteSchedule);
router.patch(
  '/:id/status',
  requireRole('doctor', 'admin'),
  requireApprovedDoctor,
  scheduleController.updateScheduleStatus
);
router.post('/slots/book', requireRole('patient', 'admin'), scheduleController.bookAppointmentSlot);

module.exports = router;

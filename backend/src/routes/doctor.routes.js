const express = require('express');
const doctorController = require('../controllers/doctor.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', requireAuth, doctorController.searchDoctors);
router.get('/:doctorId', requireAuth, doctorController.getDoctorProfile);

module.exports = router;

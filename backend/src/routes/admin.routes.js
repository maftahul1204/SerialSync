const express = require('express');
const adminController = require('../controllers/admin.controller');
const doctorDocs = require('../controllers/doctorDocument.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.use(requireAuth, requireRole('admin'));

router.get('/doctors', adminController.listDoctorsForAdmin);
router.get('/doctors/:id', doctorDocs.getDoctorDetails);
router.get('/doctors/:id/documents/:docId', doctorDocs.downloadForAdmin);
router.patch('/doctors/:id/approval', adminController.setDoctorApproval);
router.get('/audit', adminController.listAuditLog);

module.exports = router;

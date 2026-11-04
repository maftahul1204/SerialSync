const express = require('express');
const user = require('../controllers/user.controller');
const doctorDocs = require('../controllers/doctorDocument.controller');
const { parseDoctorDocuments } = require('../middleware/doctorUpload');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, user.getProfile);
router.patch('/me', requireAuth, user.updateProfile);
router.post('/me/documents', requireAuth, requireRole('doctor'), parseDoctorDocuments, doctorDocs.uploadMine);
router.get('/me/documents/:docId', requireAuth, requireRole('doctor'), doctorDocs.downloadMine);

router.get(
  '/admin/overview',
  requireAuth,
  requireRole('admin'),
  (req, res) => {
    res.json({
      success: true,
      message: 'Admin RBAC route',
      admin: req.user.toSafeJSON(),
    });
  }
);

module.exports = router;

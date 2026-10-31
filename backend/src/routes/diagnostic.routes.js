const express = require('express');
const multer = require('multer');
const { requireAuth, requireRole } = require('../middleware/auth');
const diagnosticController = require('../controllers/diagnostic.controller');

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
  fileFilter(_req, file, cb) {
    if (file.mimetype === 'application/pdf') cb(null, true);
    else cb(Object.assign(new Error('Only PDF reports are allowed'), { status: 400 }));
  },
});

const router = express.Router();

router.get('/tests', requireAuth, diagnosticController.listTests);
router.post('/tests', requireAuth, requireRole('admin'), diagnosticController.createTest);
router.patch('/tests/:id', requireAuth, requireRole('admin'), diagnosticController.updateTest);
router.get('/trends', requireAuth, requireRole('patient'), diagnosticController.myTrends);
router.get('/orders', requireAuth, requireRole('admin'), diagnosticController.listAllOrders);
router.get('/centers', requireAuth, diagnosticController.listCenters);
router.get('/centers/:id', requireAuth, diagnosticController.getCenter);
router.post('/centers', requireAuth, requireRole('admin'), diagnosticController.createCenter);
router.patch('/centers/:id', requireAuth, requireRole('admin'), diagnosticController.updateCenter);
router.get('/packages', requireAuth, diagnosticController.listPackages);
router.post('/orders', requireAuth, requireRole('patient'), diagnosticController.createOrder);
router.get('/orders/me', requireAuth, requireRole('patient'), diagnosticController.listMyOrders);
router.get(
  '/orders/assigned',
  requireAuth,
  requireRole('phlebotomist', 'admin'),
  diagnosticController.phlebotomistQueue
);
router.get('/orders/:id', requireAuth, diagnosticController.getOrder);
router.patch(
  '/orders/:id/status',
  requireAuth,
  requireRole('phlebotomist', 'admin'),
  diagnosticController.updateOrderStatus
);
router.post(
  '/orders/:id/report',
  requireAuth,
  requireRole('admin'),
  upload.single('report'),
  diagnosticController.uploadReport
);
router.get('/orders/:id/download', requireAuth, diagnosticController.downloadReport);
router.post(
  '/orders/:id/share-doctor',
  requireAuth,
  requireRole('patient'),
  diagnosticController.shareWithDoctor
);

module.exports = router;

const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const queueController = require('../controllers/queue.controller');

const router = express.Router();

router.get('/me/today', requireAuth, requireRole('patient'), queueController.myQueueView);
router.get('/sessions/:id', requireAuth, queueController.getState);
router.post(
  '/sessions',
  requireAuth,
  requireRole('assistant', 'admin', 'doctor'),
  queueController.ensureSession
);
router.post(
  '/sessions/:id/advance',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.advance
);
router.post(
  '/sessions/:id/walk-in',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.walkIn
);
router.post(
  '/sessions/:id/no-show',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.noShow
);
router.post(
  '/sessions/:id/undo',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.undo
);
router.post(
  '/sessions/:id/delay',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.delayBroadcast
);
router.post(
  '/sessions/:id/pause',
  requireAuth,
  requireRole('assistant', 'admin'),
  queueController.pauseSession
);

module.exports = router;

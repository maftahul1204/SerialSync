const express = require('express');
const user = require('../controllers/user.controller');
const { requireAuth, requireRole } = require('../middleware/auth');

const router = express.Router();

router.get('/me', requireAuth, user.getProfile);
router.patch('/me', requireAuth, user.updateProfile);

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

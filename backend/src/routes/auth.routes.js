const express = require('express');
const auth = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const { authLimiter } = require('../middleware/rateLimit');
const { parseDoctorDocuments } = require('../middleware/doctorUpload');

const router = express.Router();

router.post('/register', authLimiter, parseDoctorDocuments, auth.register);
router.post('/login', authLimiter, auth.login);
router.post('/logout', auth.logout);
router.post('/forgot-password', authLimiter, auth.forgotPassword);
router.post('/reset-password', authLimiter, auth.resetPassword);
router.post('/change-password', authLimiter, requireAuth, auth.changePassword);
router.get('/me', requireAuth, auth.me);

module.exports = router;

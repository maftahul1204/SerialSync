const express = require('express');
const auth = require('../controllers/auth.controller');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.post('/register', auth.register);
router.post('/login', auth.login);
router.post('/logout', auth.logout);
router.post('/forgot-password', auth.forgotPassword);
router.post('/reset-password', auth.resetPassword);
router.post('/change-password', requireAuth, auth.changePassword);
router.get('/me', requireAuth, auth.me);

module.exports = router;

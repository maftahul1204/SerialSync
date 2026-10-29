const express = require('express');
const { requireAuth } = require('../middleware/auth');
const c = require('../controllers/notification.controller');

const router = express.Router();
router.use(requireAuth);
router.get('/', c.listMine);
router.post('/read-all', c.markAllRead);
router.patch('/:id/read', c.markRead);

module.exports = router;

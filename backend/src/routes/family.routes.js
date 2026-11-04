const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const c = require('../controllers/family.controller');

const router = express.Router();
router.use(requireAuth, requireRole('patient'));
router.get('/', c.list);
router.post('/', c.create);
router.patch('/:id', c.update);
router.delete('/:id', c.remove);

module.exports = router;

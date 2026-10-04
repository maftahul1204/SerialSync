const express = require('express');
const { requireAuth, requireRole } = require('../middleware/auth');
const chamberController = require('../controllers/chamber.controller');

const router = express.Router();

router.use(requireAuth, requireRole('doctor', 'admin'));

router.get('/', chamberController.listMyChambers);
router.post('/', chamberController.createChamber);
router.patch('/:id', chamberController.updateChamber);

module.exports = router;

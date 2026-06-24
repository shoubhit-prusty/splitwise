const express = require('express');
const { getSimplifiedDebts, markSettled, getDashboard } = require('../controllers/settlement.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboard);
router.get('/groups/:groupId', getSimplifiedDebts);
router.post('/groups/:groupId/settle', markSettled);

module.exports = router;

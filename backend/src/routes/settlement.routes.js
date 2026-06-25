const express = require('express');
const { getSimplifiedDebts, proposeSettlement, markSettled, getDashboard } = require('../controllers/settlement.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/dashboard', getDashboard);
router.get('/groups/:groupId', getSimplifiedDebts);
router.post('/groups/:groupId/propose', upload.single('proof'), proposeSettlement);
router.post('/groups/:groupId/settle', markSettled);

module.exports = router;

const express = require('express');
const { uploadReceipt, confirmReceipt, deleteExpense } = require('../controllers/receipt.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const { upload } = require('../middleware/upload.middleware');
const router = express.Router();

router.use(authMiddleware);

router.post('/upload', upload.single('receipt'), uploadReceipt);
router.post('/confirm', confirmReceipt);
router.delete('/expense/:id', deleteExpense);

module.exports = router;

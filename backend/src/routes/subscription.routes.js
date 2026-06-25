const express = require('express');
const { addSubscription, getSubscriptions, toggleSubscriptionStatus, deleteSubscription } = require('../controllers/subscription.controller');
const { authMiddleware } = require('../middleware/auth.middleware');

const router = express.Router({ mergeParams: true });

router.use(authMiddleware);

router.post('/', addSubscription);
router.get('/', getSubscriptions);
router.patch('/:id/status', toggleSubscriptionStatus);
router.delete('/:id', deleteSubscription);

module.exports = router;

const express = require('express');
const {
  createGroup, getGroups, getGroupById, addMember, updateMemberDiet, deleteGroup,
} = require('../controllers/group.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const chatRoutes = require('./chat.routes');
const subscriptionRoutes = require('./subscription.routes');
const router = express.Router();

router.use(authMiddleware);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroupById);
router.delete('/:id', deleteGroup);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId/diet', updateMemberDiet);

router.use('/:groupId/messages', chatRoutes);
router.use('/:groupId/subscriptions', subscriptionRoutes);

module.exports = router;

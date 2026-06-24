const express = require('express');
const {
  createGroup, getGroups, getGroupById, addMember, updateMemberDiet,
} = require('../controllers/group.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/', getGroups);
router.post('/', createGroup);
router.get('/:id', getGroupById);
router.post('/:id/members', addMember);
router.patch('/:id/members/:userId/diet', updateMemberDiet);

module.exports = router;

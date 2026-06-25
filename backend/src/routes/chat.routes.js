const express = require('express');
const router = express.Router({ mergeParams: true });
const { getGroupMessages, sendMessage, editMessage, deleteMessage, markMessagesAsRead } = require('../controllers/chat.controller');

// These routes will be mounted at /api/groups/:groupId/messages
router.get('/', getGroupMessages);
router.post('/', sendMessage);
router.post('/read', markMessagesAsRead);
router.patch('/:msgId', editMessage);
router.delete('/:msgId', deleteMessage);

module.exports = router;

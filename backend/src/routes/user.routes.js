const express = require('express');
const { getProfile, searchUsers, getUserById } = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/me', getProfile);
router.get('/search', searchUsers);
router.get('/:id', getUserById);

module.exports = router;

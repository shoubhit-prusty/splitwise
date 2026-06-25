const express = require('express');
const { getProfile, searchUsers, getUserById, updateProfile } = require('../controllers/user.controller');
const { authMiddleware } = require('../middleware/auth.middleware');
const router = express.Router();

router.use(authMiddleware);

router.get('/me', getProfile);
router.put('/profile', updateProfile);
router.get('/search', searchUsers);
router.get('/:id', getUserById);

module.exports = router;

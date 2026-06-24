const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');

/**
 * GET /api/users/me
 */
const getProfile = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: { id: true, name: true, email: true, phone: true, avatarColor: true, createdAt: true },
    });
    if (!user) throw new AppError('User not found.', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/search?q=email_or_phone
 */
const searchUsers = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return res.json({ users: [] });
    }

    const users = await prisma.user.findMany({
      where: {
        AND: [
          { id: { not: req.user.userId } }, // Exclude self
          {
            OR: [
              { email: { contains: q.trim(), mode: 'insensitive' } },
              { phone: { contains: q.trim() } },
              { name: { contains: q.trim(), mode: 'insensitive' } },
            ],
          },
        ],
      },
      select: { id: true, name: true, email: true, phone: true, avatarColor: true },
      take: 10,
    });

    res.json({ users });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      select: { id: true, name: true, email: true, avatarColor: true },
    });
    if (!user) throw new AppError('User not found.', 404);
    res.json({ user });
  } catch (error) {
    next(error);
  }
};

module.exports = { getProfile, searchUsers, getUserById };

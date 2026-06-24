const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');

const generateToken = (userId) => {
  return jwt.sign({ userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });
};

// Generate a random avatar color from a curated palette
const AVATAR_COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#eab308', '#22c55e', '#14b8a6', '#3b82f6',
];
const randomColor = () => AVATAR_COLORS[Math.floor(Math.random() * AVATAR_COLORS.length)];

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      throw new AppError('Name, email, and password are required.', 400);
    }
    if (password.length < 6) {
      throw new AppError('Password must be at least 6 characters.', 400);
    }

    const existingUser = await prisma.user.findFirst({
      where: { OR: [{ email }, ...(phone ? [{ phone }] : [])] },
    });
    if (existingUser) {
      throw new AppError('A user with this email or phone already exists.', 409);
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: { name, email, phone: phone || null, passwordHash, avatarColor: randomColor() },
      select: { id: true, name: true, email: true, phone: true, avatarColor: true, createdAt: true },
    });

    const token = generateToken(user.id);

    res.status(201).json({ message: 'Registration successful.', token, user });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      throw new AppError('Email and password are required.', 400);
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new AppError('Invalid email or password.', 401);
    }

    const isPasswordValid = await bcrypt.compare(password, user.passwordHash);
    if (!isPasswordValid) {
      throw new AppError('Invalid email or password.', 401);
    }

    const token = generateToken(user.id);
    const { passwordHash, ...safeUser } = user;

    res.json({ message: 'Login successful.', token, user: safeUser });
  } catch (error) {
    next(error);
  }
};

module.exports = { register, login };

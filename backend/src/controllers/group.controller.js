const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');
const { calculateGroupBalances } = require('../services/balance.service');

/**
 * POST /api/groups — Create a new group
 */
const createGroup = async (req, res, next) => {
  try {
    const { name, icon, description, memberIds } = req.body;
    if (!name) throw new AppError('Group name is required.', 400);

    // Validate all memberIds exist
    const allMemberIds = [...new Set([req.user.userId, ...(memberIds || [])])];

    const group = await prisma.group.create({
      data: {
        name,
        icon: icon || '🏠',
        description,
        members: {
          create: allMemberIds.map((uid) => ({
            userId: uid,
            role: uid === req.user.userId ? 'admin' : 'member',
          })),
        },
      },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
      },
    });

    res.status(201).json({ message: 'Group created.', group });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups — Get all groups for the logged-in user
 */
const getGroups = async (req, res, next) => {
  try {
    const groups = await prisma.group.findMany({
      where: { members: { some: { userId: req.user.userId } } },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
        _count: { select: { expenses: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    res.json({ groups });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/groups/:id — Get a single group with expenses and balances
 */
const getGroupById = async (req, res, next) => {
  try {
    const group = await prisma.group.findUnique({
      where: { id: req.params.id },
      include: {
        members: { include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } } },
        expenses: {
          include: {
            payer: { select: { id: true, name: true, avatarColor: true } },
            shares: { include: { user: { select: { id: true, name: true } } } },
          },
          orderBy: { createdAt: 'desc' },
        },
        subscriptions: {
          include: {
            payer: { select: { id: true, name: true, avatarColor: true } },
            shares: { include: { user: { select: { id: true, name: true } } } },
          },
        },
      },
    });

    if (!group) throw new AppError('Group not found.', 404);

    // Check membership
    const isMember = group.members.some((m) => m.userId === req.user.userId);
    if (!isMember) throw new AppError('Access denied.', 403);

    const balances = await calculateGroupBalances(req.params.id, req.user.userId);

    res.json({ group, balances });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/groups/:id/members — Add a member to a group
 */
const addMember = async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) throw new AppError('User ID is required.', 400);

    const existing = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId, groupId: req.params.id } },
    });
    if (existing) throw new AppError('User is already a member of this group.', 409);

    const member = await prisma.groupMember.create({
      data: { userId, groupId: req.params.id },
      include: { user: { select: { id: true, name: true, email: true, avatarColor: true } } },
    });

    res.status(201).json({ message: 'Member added.', member });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/groups/:id/members/:userId/diet — Update a member's diet type
 */
const updateMemberDiet = async (req, res, next) => {
  try {
    const { dietType } = req.body;
    if (!['veg', 'everything'].includes(dietType)) {
      throw new AppError('Diet type must be "veg" or "everything".', 400);
    }

    const member = await prisma.groupMember.update({
      where: { userId_groupId: { userId: req.params.userId, groupId: req.params.id } },
      data: { dietType },
    });

    res.json({ message: 'Diet preference updated.', member });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/groups/:id — Delete a group permanently
 */
const deleteGroup = async (req, res, next) => {
  try {
    const groupId = req.params.id;

    // Verify group and membership
    const group = await prisma.group.findUnique({
      where: { id: groupId },
      include: { members: true },
    });

    if (!group) throw new AppError('Group not found.', 404);

    const membership = group.members.find((m) => m.userId === req.user.userId);
    if (!membership) throw new AppError('Access denied.', 403);
    if (membership.role !== 'admin') throw new AppError('Only group admins can delete the group.', 403);

    // Prisma onDelete: Cascade will handle Expense, ExpenseShare, ItemShare, ExpenseItem, GroupMember, Debt, Message, and Settlement
    await prisma.group.delete({
      where: { id: groupId },
    });

    res.json({ message: 'Group deleted permanently.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { createGroup, getGroups, getGroupById, addMember, updateMemberDiet, deleteGroup };

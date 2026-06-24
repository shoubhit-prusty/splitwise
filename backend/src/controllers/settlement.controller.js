const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');
const { simplifyDebts } = require('../utils/simplifyDebts.util');
const { getDashboardSummary } = require('../services/balance.service');

/**
 * GET /api/settlements/groups/:groupId — Get simplified debt transactions for a group
 */
const getSimplifiedDebts = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Verify membership
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user.userId, groupId } },
    });
    if (!membership) throw new AppError('Access denied.', 403);

    // Fetch all unsettled expense shares
    const shares = await prisma.expenseShare.findMany({
      where: { expense: { groupId }, settled: false },
      include: { expense: { select: { payerId: true } } },
    });

    // Convert shares to transactions format
    const transactions = shares.map((share) => ({
      fromUserId: share.userId,
      toUserId: share.expense.payerId,
      amount: parseFloat(share.amount),
    }));

    const simplified = simplifyDebts(transactions);

    // Fetch user details for the simplified transactions
    const userIds = [...new Set(simplified.flatMap((t) => [t.from, t.to]))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarColor: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = simplified.map((t) => ({
      from: userMap[t.from],
      to: userMap[t.to],
      amount: t.amount,
    }));

    res.json({ settlements: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settlements/groups/:groupId/settle — Mark a settlement as paid
 */
const markSettled = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amount, note } = req.body;

    // Mark all relevant expense shares as settled in a transaction
    await prisma.$transaction(async (tx) => {
      // Record the settlement
      await tx.settlement.create({
        data: {
          groupId,
          payerId: req.user.userId,
          receiverId: toUserId,
          amount,
          note,
        },
      });

      // Mark expense shares from this user to the receiver as settled
      await tx.expenseShare.updateMany({
        where: {
          userId: req.user.userId,
          settled: false,
          expense: { groupId, payerId: toUserId },
        },
        data: { settled: true },
      });
    });

    res.json({ message: 'Settlement recorded successfully.' });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/settlements/dashboard — Get total owed/owing across all groups
 */
const getDashboard = async (req, res, next) => {
  try {
    const summary = await getDashboardSummary(req.user.userId);
    res.json({ summary });
  } catch (error) {
    next(error);
  }
};

module.exports = { getSimplifiedDebts, markSettled, getDashboard };

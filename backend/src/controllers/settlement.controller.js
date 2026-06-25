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

    // Fetch all expense shares and settlements to calculate true mathematical balances
    const shares = await prisma.expenseShare.findMany({
      where: { expense: { groupId } },
      include: { expense: { select: { payerId: true } } },
    });

    const settlements = await prisma.settlement.findMany({
      where: { groupId, status: 'APPROVED' },
    });

    const transactions = [];

    shares.forEach((share) => {
      transactions.push({
        fromUserId: share.userId,
        toUserId: share.expense.payerId,
        amount: parseFloat(share.amount),
      });
    });

    settlements.forEach((settlement) => {
      transactions.push({
        fromUserId: settlement.receiverId,
        toUserId: settlement.payerId,
        amount: parseFloat(settlement.amount),
      });
    });

    const simplified = simplifyDebts(transactions);

    // Fetch user details for the simplified transactions
    const userIds = [...new Set(simplified.flatMap((t) => [t.from, t.to]))];
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true, email: true, avatarColor: true, upiId: true },
    });
    const userMap = Object.fromEntries(users.map((u) => [u.id, u]));

    const result = simplified.map((t) => ({
      from: userMap[t.from],
      to: userMap[t.to],
      amount: t.amount,
    }));

    const pendingSettlements = await prisma.settlement.findMany({
      where: { groupId, status: 'PENDING' },
      select: { payerId: true, receiverId: true, amount: true, proofUrl: true, createdAt: true },
    });

    res.json({ settlements: result, pendingSettlements });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settlements/groups/:groupId/propose — Debtor uploads proof of payment
 */
const proposeSettlement = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { toUserId, amount, note } = req.body;
    const proofUrl = req.file ? `/uploads/${req.file.filename}` : null;

    // proofUrl is optional now, user can just click 'I Paid' without proof

    const result = await prisma.$transaction(async (tx) => {
      const settlement = await tx.settlement.create({
        data: {
          groupId,
          payerId: req.user.userId,
          receiverId: toUserId,
          amount,
          note,
          proofUrl,
          status: 'PENDING',
        },
      });

      return { settlement };
    });

    res.status(201).json({ message: 'Payment proof uploaded successfully.', ...result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/settlements/groups/:groupId/settle — Creditor approves the payment
 */
const markSettled = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { fromUserId, amount, note } = req.body; // Changed to fromUserId

    // Mark all relevant expense shares as settled in a transaction
    await prisma.$transaction(async (tx) => {
      // Find any pending settlement and approve it, or create a new approved one
      const pending = await tx.settlement.findFirst({
        where: { groupId, payerId: fromUserId, receiverId: req.user.userId, status: 'PENDING' },
      });

      if (pending) {
        await tx.settlement.update({
          where: { id: pending.id },
          data: { status: 'APPROVED', note: note || pending.note },
        });
      } else {
        await tx.settlement.create({
          data: {
            groupId,
            payerId: fromUserId,
            receiverId: req.user.userId,
            amount,
            note,
            status: 'APPROVED',
          },
        });
      }

      // Mark expense shares from the debtor (fromUserId) to the receiver (req.user.userId) as settled
      await tx.expenseShare.updateMany({
        where: {
          userId: fromUserId,
          settled: false,
          expense: { groupId, payerId: req.user.userId },
        },
        data: { settled: true },
      });

      // Calculate Gamification Points for the DEBTOR (fromUserId)
      const mostRecentExpense = await tx.expense.findFirst({
        where: { groupId },
        orderBy: { createdAt: 'desc' },
      });

      let scoreGain = 15; // Base reward
      let speedBonus = false;

      if (mostRecentExpense) {
        const settlementTime = pending ? new Date(pending.createdAt).getTime() : Date.now();
        const hoursSinceExpense = (settlementTime - new Date(mostRecentExpense.createdAt).getTime()) / (1000 * 60 * 60);
        
        if (hoursSinceExpense >= 0 && hoursSinceExpense <= 24) {
          speedBonus = true;
          
          if (hoursSinceExpense <= 1) {
            // Find how many people paid between the expense and this settlement
            const priorSettlementsCount = await tx.settlement.count({
              where: {
                groupId,
                createdAt: {
                  gte: mostRecentExpense.createdAt,
                  lt: new Date(settlementTime),
                },
              },
            });
            scoreGain = Math.max(15, 25 - priorSettlementsCount); // 25, 24, 23...
          } else {
            scoreGain = 20; // Paid within 24 hours but after 1 hour
          }
        }
      }

      const groupMember = await tx.groupMember.update({
        where: { userId_groupId: { groupId, userId: fromUserId } },
        data: { trustScore: { increment: scoreGain } },
        select: { trustScore: true, badges: true },
      });

      const newBadges = [];
      if (speedBonus && !groupMember.badges.includes('Speed Demon ⚡')) newBadges.push('Speed Demon ⚡');
      if (groupMember.trustScore >= 600 && !groupMember.badges.includes('Prompt Payer 🥇')) newBadges.push('Prompt Payer 🥇');
      if (groupMember.trustScore >= 1000 && !groupMember.badges.includes('Trustworthy 🤝')) newBadges.push('Trustworthy 🤝');

      if (newBadges.length > 0) {
        await tx.groupMember.update({
          where: { userId_groupId: { groupId, userId: fromUserId } },
          data: { badges: { push: newBadges } },
        });
      }
    });

    res.json({ message: 'Settlement approved successfully.' });
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

module.exports = { getSimplifiedDebts, proposeSettlement, markSettled, getDashboard };

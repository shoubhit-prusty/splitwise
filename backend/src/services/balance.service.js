const prisma = require('../lib/prisma');

/**
 * Calculate the balance for a specific user within a group.
 * Returns: { youAreOwed, youOwe, netBalance, breakdown }
 */
const calculateGroupBalances = async (groupId, userId) => {
  const shares = await prisma.expenseShare.findMany({
    where: { expense: { groupId }, settled: false },
    include: { expense: { select: { payerId: true, description: true } }, user: { select: { id: true, name: true } } },
  });

  let youAreOwed = 0;
  let youOwe = 0;
  const breakdown = {};

  for (const share of shares) {
    const amount = parseFloat(share.amount);
    const payerId = share.expense.payerId;
    const shareUserId = share.userId;

    // If current user paid and someone else owes
    if (payerId === userId && shareUserId !== userId) {
      youAreOwed += amount;
      breakdown[shareUserId] = (breakdown[shareUserId] || 0) + amount;
    }

    // If current user owes someone else
    if (shareUserId === userId && payerId !== userId) {
      youOwe += amount;
      breakdown[payerId] = (breakdown[payerId] || 0) - amount;
    }
  }

  return {
    youAreOwed: parseFloat(youAreOwed.toFixed(2)),
    youOwe: parseFloat(youOwe.toFixed(2)),
    netBalance: parseFloat((youAreOwed - youOwe).toFixed(2)),
    breakdown, // { userId: netAmount } positive = they owe you, negative = you owe them
  };
};

/**
 * Get dashboard-level summary across all groups for a user.
 */
const getDashboardSummary = async (userId) => {
  const groups = await prisma.group.findMany({
    where: { members: { some: { userId } } },
    select: { id: true },
  });

  let totalOwed = 0;
  let totalOwe = 0;

  for (const group of groups) {
    const bal = await calculateGroupBalances(group.id, userId);
    totalOwed += bal.youAreOwed;
    totalOwe += bal.youOwe;
  }

  return {
    totalOwed: parseFloat(totalOwed.toFixed(2)),
    totalOwe: parseFloat(totalOwe.toFixed(2)),
    netBalance: parseFloat((totalOwed - totalOwe).toFixed(2)),
  };
};

module.exports = { calculateGroupBalances, getDashboardSummary };

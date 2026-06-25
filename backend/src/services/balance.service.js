const prisma = require('../lib/prisma');
const { simplifyDebts } = require('../utils/simplifyDebts.util');

/**
 * Calculate the balance for a specific user within a group.
 * Returns: { youAreOwed, youOwe, netBalance, breakdown }
 */
const calculateGroupBalances = async (groupId, userId) => {
  const shares = await prisma.expenseShare.findMany({
    where: { expense: { groupId } },
    include: { expense: { select: { payerId: true } } },
  });

  const settlements = await prisma.settlement.findMany({
    where: { groupId, status: 'APPROVED' },
  });

  const transactions = [];

  // Expenses create debt FROM the person who owes TO the person who paid
  shares.forEach((share) => {
    transactions.push({
      fromUserId: share.userId,
      toUserId: share.expense.payerId,
      amount: parseFloat(share.amount),
    });
  });

  // Settlements reverse debt. If A pays B, B receives the money, meaning B owes A for that amount (mathematically reducing A's debt to B).
  settlements.forEach((settlement) => {
    transactions.push({
      fromUserId: settlement.receiverId,
      toUserId: settlement.payerId,
      amount: parseFloat(settlement.amount),
    });
  });

  const simplified = simplifyDebts(transactions);

  const breakdown = {};
  let youAreOwed = 0;
  let youOwe = 0;

  for (const t of simplified) {
    if (t.from === userId) {
      youOwe += t.amount;
      breakdown[t.to] = -t.amount;
    } else if (t.to === userId) {
      youAreOwed += t.amount;
      breakdown[t.from] = t.amount;
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

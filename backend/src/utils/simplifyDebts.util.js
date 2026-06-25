/**
 * Greedy Debt Simplification Algorithm
 *
 * Minimizes the number of transactions needed to settle all debts in a group.
 *
 * Algorithm:
 * 1. Compute net balance for each person (positive = net creditor, negative = net debtor)
 * 2. Use a two-pointer greedy approach: match the largest debtor with the largest creditor
 * 3. Repeat until all balances are zero
 *
 * Complexity: O(n²) worst case, optimal for groups up to ~100 members.
 *
 * @param {Array} transactions - [{ fromUserId, toUserId, amount }]
 * @returns {Array} - Simplified [{ from, to, amount }]
 */
const simplifyDebts = (transactions) => {
  // Step 1: Compute net balances
  const balanceMap = {};

  for (const tx of transactions) {
    balanceMap[tx.fromUserId] = (balanceMap[tx.fromUserId] || 0) - tx.amount;
    balanceMap[tx.toUserId] = (balanceMap[tx.toUserId] || 0) + tx.amount;
  }

  // Round to avoid floating point issues
  const balances = Object.entries(balanceMap).map(([userId, balance]) => ({
    userId,
    balance: Math.round(balance * 100) / 100,
  }));

  const result = [];

  // Step 2: Greedy matching
  while (true) {
    // Sort: most negative (biggest debtor) first, most positive (biggest creditor) last
    balances.sort((a, b) => a.balance - b.balance);

    const debtor = balances[0];
    const creditor = balances[balances.length - 1];

    if (!debtor || !creditor) break;

    // Base case: all settled
    if (Math.abs(debtor.balance) < 0.01 && Math.abs(creditor.balance) < 0.01) break;

    const settleAmount = Math.min(Math.abs(debtor.balance), creditor.balance);
    settleAmount_rounded = Math.round(settleAmount * 100) / 100;

    if (settleAmount_rounded > 0) {
      result.push({
        from: debtor.userId,
        to: creditor.userId,
        amount: settleAmount_rounded,
      });
    }

    debtor.balance = Math.round((debtor.balance + settleAmount) * 100) / 100;
    creditor.balance = Math.round((creditor.balance - settleAmount) * 100) / 100;
  }

  return result;
};

module.exports = { simplifyDebts };

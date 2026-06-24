const Decimal = require('decimal.js');

/**
 * Calculate each member's proportional share of an itemized bill with tax/tip.
 *
 * @param {Array} items - [{ id, price, quantity, isVeg, assignedUserIds: [] }]
 * @param {number} tax - Tax amount in ₹
 * @param {number} tip - Tip amount in ₹
 * @param {Array} memberIds - All member IDs in the group
 * @param {Object} memberDiets - { userId: 'veg' | 'everything' }
 * @returns {Object} { userId: totalShare }
 */
const calculateItemizedShares = (items, tax, tip, memberIds, memberDiets) => {
  const userSubtotals = {};
  memberIds.forEach((uid) => (userSubtotals[uid] = new Decimal(0)));

  for (const item of items) {
    const itemTotal = new Decimal(item.price).times(item.quantity);
    let eligibleUsers = item.assignedUserIds || [];

    // If no explicit assignment, use diet filter
    if (!eligibleUsers.length) {
      eligibleUsers = item.isVeg
        ? memberIds // All members can eat veg items
        : memberIds.filter((uid) => memberDiets[uid] !== 'veg'); // Non-veg eaters only
    }

    if (!eligibleUsers.length) continue;

    const perPersonShare = itemTotal.dividedBy(eligibleUsers.length);
    for (const uid of eligibleUsers) {
      if (userSubtotals[uid] !== undefined) {
        userSubtotals[uid] = userSubtotals[uid].plus(perPersonShare);
      }
    }
  }

  // Calculate total subtotal
  const totalSubtotal = Object.values(userSubtotals).reduce(
    (sum, val) => sum.plus(val),
    new Decimal(0)
  );

  if (totalSubtotal.isZero()) {
    return Object.fromEntries(memberIds.map((uid) => [uid, 0]));
  }

  // Proportionally distribute tax and tip
  const taxAmount = new Decimal(tax || 0);
  const tipAmount = new Decimal(tip || 0);

  const finalShares = {};
  for (const uid of memberIds) {
    const subtotal = userSubtotals[uid];
    const proportion = subtotal.dividedBy(totalSubtotal);
    const taxShare = taxAmount.times(proportion);
    const tipShare = tipAmount.times(proportion);
    finalShares[uid] = parseFloat(subtotal.plus(taxShare).plus(tipShare).toFixed(2));
  }

  return finalShares;
};

/**
 * Calculate equal split shares.
 */
const calculateEqualShares = (totalAmount, memberIds) => {
  const share = parseFloat((totalAmount / memberIds.length).toFixed(2));
  const remainder = parseFloat(
    (totalAmount - share * memberIds.length).toFixed(2)
  );

  const shares = {};
  memberIds.forEach((uid, idx) => {
    // Give the remainder to the first person
    shares[uid] = idx === 0 ? parseFloat((share + remainder).toFixed(2)) : share;
  });
  return shares;
};

module.exports = { calculateItemizedShares, calculateEqualShares };

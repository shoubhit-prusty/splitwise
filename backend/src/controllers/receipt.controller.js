const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');
const { parseReceiptImage } = require('../utils/ocr.util');
const { calculateItemizedShares, calculateEqualShares } = require('../services/split.service');

/**
 * POST /api/receipts/upload — Upload and OCR a receipt image
 */
const uploadReceipt = async (req, res, next) => {
  try {
    if (!req.file) throw new AppError('No image file uploaded.', 400);

    const { items, rawText } = await parseReceiptImage(req.file.path);
    const receiptUrl = `/uploads/${req.file.filename}`;

    res.json({ items, receiptUrl, rawText: rawText.substring(0, 500) });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/receipts/confirm — Create an expense from corrected receipt items
 */
const confirmReceipt = async (req, res, next) => {
  try {
    const { groupId, description, items, tax, tip, receiptUrl, memberDiets } = req.body;

    if (!groupId || !items?.length) {
      throw new AppError('Group ID and items are required.', 400);
    }

    // Verify group membership
    const membership = await prisma.groupMember.findUnique({
      where: { userId_groupId: { userId: req.user.userId, groupId } },
    });
    if (!membership) throw new AppError('You are not a member of this group.', 403);

    // Get all group member IDs
    const groupMembers = await prisma.groupMember.findMany({
      where: { groupId },
      select: { userId: true, dietType: true },
    });
    const memberIds = groupMembers.map((m) => m.userId);
    const memberDietsMap = Object.fromEntries(groupMembers.map((m) => [m.userId, m.dietType]));

    // Calculate subtotal
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const totalAmount = subtotal + (tax || 0) + (tip || 0);

    // Calculate proportional shares
    const shares = calculateItemizedShares(
      items,
      tax || 0,
      tip || 0,
      memberIds,
      memberDietsMap
    );

    // Create expense with items and shares in a transaction
    const expense = await prisma.$transaction(async (tx) => {
      const newExpense = await tx.expense.create({
        data: {
          groupId,
          payerId: req.user.userId,
          description: description || 'Receipt',
          totalAmount,
          subtotal,
          tax: tax || 0,
          tip: tip || 0,
          receiptUrl,
          splitType: 'itemized',
        },
      });

      // Create expense items
      for (const item of items) {
        const expItem = await tx.expenseItem.create({
          data: {
            expenseId: newExpense.id,
            name: item.name,
            price: item.price,
            quantity: item.quantity,
            isVeg: item.isVeg,
          },
        });

        // Assign item shares
        const assignedUsers = item.assignedUserIds?.length > 0
          ? item.assignedUserIds
          : item.isVeg
          ? memberIds
          : memberIds.filter((uid) => memberDietsMap[uid] !== 'veg');

        for (const uid of assignedUsers) {
          await tx.itemShare.create({ data: { itemId: expItem.id, userId: uid } });
        }
      }

      // Create expense shares (total per person)
      for (const [userId, amount] of Object.entries(shares)) {
        if (amount > 0 && userId !== req.user.userId) {
          await tx.expenseShare.create({
            data: { expenseId: newExpense.id, userId, amount },
          });
        }
      }

      return newExpense;
    });

    res.status(201).json({ message: 'Expense created from receipt.', expense, shares });
  } catch (error) {
    next(error);
  }
};

module.exports = { uploadReceipt, confirmReceipt };

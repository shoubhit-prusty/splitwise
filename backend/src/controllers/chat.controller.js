const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');

/**
 * GET /api/groups/:groupId/messages
 * Fetch all messages for a specific group
 */
const getGroupMessages = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    // Ensure the user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this group.', 403);
    }

    const messages = await prisma.message.findMany({
      where: { 
        groupId,
        NOT: { deletedFor: { has: req.user.userId } }
      },
      include: {
        user: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    res.json({ messages });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/groups/:groupId/messages
 * Send a new message to the group
 */
const sendMessage = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      throw new AppError('Message text is required.', 400);
    }

    // Ensure the user is a member of the group
    const membership = await prisma.groupMember.findUnique({
      where: {
        userId_groupId: {
          userId: req.user.userId,
          groupId,
        },
      },
    });

    if (!membership) {
      throw new AppError('You are not a member of this group.', 403);
    }

    const message = await prisma.message.create({
      data: {
        groupId,
        userId: req.user.userId,
        text: text.trim(),
      },
      include: {
        user: {
          select: { id: true, name: true, avatarColor: true },
        },
      },
    });

    res.status(201).json({ message });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/groups/:groupId/messages/:msgId
 * Edit a message
 */
const editMessage = async (req, res, next) => {
  try {
    const { groupId, msgId } = req.params;
    const { text } = req.body;

    if (!text || text.trim() === '') {
      throw new AppError('Message text is required.', 400);
    }

    const message = await prisma.message.findUnique({ where: { id: msgId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.userId !== req.user.userId) throw new AppError('You can only edit your own messages', 403);
    if (message.groupId !== groupId) throw new AppError('Message does not belong to this group', 400);

    const updatedMessage = await prisma.message.update({
      where: { id: msgId },
      data: { text: text.trim(), isEdited: true },
      include: { user: { select: { id: true, name: true, avatarColor: true } } },
    });

    res.json({ message: updatedMessage });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/groups/:groupId/messages/:msgId?type=everyone|me
 * Delete a message
 */
const deleteMessage = async (req, res, next) => {
  try {
    const { groupId, msgId } = req.params;
    const { type } = req.query;

    const message = await prisma.message.findUnique({ where: { id: msgId } });
    if (!message) throw new AppError('Message not found', 404);
    if (message.groupId !== groupId) throw new AppError('Message does not belong to this group', 400);

    let updatedMessage;

    if (type === 'everyone') {
      if (message.userId !== req.user.userId) throw new AppError('You can only delete your own messages for everyone', 403);
      updatedMessage = await prisma.message.update({
        where: { id: msgId },
        data: { isDeleted: true },
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      });
    } else {
      // type === 'me'
      updatedMessage = await prisma.message.update({
        where: { id: msgId },
        data: { deletedFor: { push: req.user.userId } },
        include: { user: { select: { id: true, name: true, avatarColor: true } } },
      });
    }

    res.json({ message: updatedMessage });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/groups/:groupId/messages/read
 * Mark messages as read by the current user
 */
const markMessagesAsRead = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { messageIds } = req.body;

    if (!messageIds || !Array.isArray(messageIds) || messageIds.length === 0) {
      return res.json({ success: true });
    }

    // Since Prisma updateMany doesn't easily support array pushes natively in a single query across multiple rows 
    // unless using raw SQL, we will just iterate and update them.
    // In PostgreSQL, we could theoretically do an array append, but iterating in a transaction is fine.
    
    // Actually, `updateMany` doesn't allow push. 
    // We will do a transaction with multiple updates.
    const updates = messageIds.map((msgId) =>
      prisma.message.update({
        where: { id: msgId },
        data: { seenBy: { push: req.user.userId } },
      })
    );

    await prisma.$transaction(updates);

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
};

module.exports = { getGroupMessages, sendMessage, editMessage, deleteMessage, markMessagesAsRead };

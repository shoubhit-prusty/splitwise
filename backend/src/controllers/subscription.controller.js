const prisma = require('../lib/prisma');
const { AppError } = require('../middleware/error.middleware');

const addSubscription = async (req, res, next) => {
  try {
    const { groupId } = req.params;
    const { name, amount, cycle, intervalCount, nextBillingDate, splitType, shares } = req.body;
    
    // shares is an array of { userId, percentage, amount }

    const subscription = await prisma.subscription.create({
      data: {
        groupId,
        payerId: req.user.userId,
        name,
        amount,
        cycle,
        intervalCount: intervalCount || 1,
        nextBillingDate: new Date(nextBillingDate),
        splitType,
        shares: {
          create: shares.map(share => ({
            userId: share.userId,
            amount: share.amount || null,
            percentage: share.percentage || null
          }))
        }
      },
      include: {
        payer: { select: { id: true, name: true, avatarColor: true } },
        shares: { include: { user: { select: { id: true, name: true } } } }
      }
    });

    res.status(201).json({ message: 'Subscription added.', subscription });
  } catch (error) {
    next(error);
  }
};

const getSubscriptions = async (req, res, next) => {
  try {
    const { groupId } = req.params;

    const subscriptions = await prisma.subscription.findMany({
      where: { groupId },
      include: {
        payer: { select: { id: true, name: true, avatarColor: true } },
        shares: { include: { user: { select: { id: true, name: true } } } }
      },
      orderBy: { nextBillingDate: 'asc' }
    });

    res.json({ subscriptions });
  } catch (error) {
    next(error);
  }
};

const toggleSubscriptionStatus = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const subscription = await prisma.subscription.update({
      where: { id },
      data: { status }
    });

    res.json({ message: `Subscription ${status.toLowerCase()}`, subscription });
  } catch (error) {
    next(error);
  }
};

const deleteSubscription = async (req, res, next) => {
  try {
    const { id } = req.params;
    await prisma.subscription.delete({ where: { id } });
    res.json({ message: 'Subscription deleted.' });
  } catch (error) {
    next(error);
  }
};

module.exports = { addSubscription, getSubscriptions, toggleSubscriptionStatus, deleteSubscription };

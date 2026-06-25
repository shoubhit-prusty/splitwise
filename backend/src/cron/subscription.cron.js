const cron = require('node-cron');
const prisma = require('../lib/prisma');

const processSubscriptions = async () => {
  console.log('[CRON] Checking for due subscriptions...');
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const dueSubscriptions = await prisma.subscription.findMany({
      where: {
        status: 'ACTIVE',
        nextBillingDate: {
          gte: today,
          lt: tomorrow,
        }
      },
      include: {
        shares: true
      }
    });

    for (const sub of dueSubscriptions) {
      console.log(`[CRON] Processing subscription: ${sub.name}`);

      await prisma.$transaction(async (tx) => {
        // Create the Expense
        const expense = await tx.expense.create({
          data: {
            groupId: sub.groupId,
            payerId: sub.payerId,
            description: `🔄 Auto-Pay: ${sub.name}`,
            amount: sub.amount,
            splitType: sub.splitType,
            date: new Date(),
            shares: {
              create: sub.shares.map(s => ({
                userId: s.userId,
                amount: s.amount,
                percentage: s.percentage
              }))
            }
          }
        });

        // Add a message to the group chat
        const countMsg = sub.intervalCount || 1;
        let cycleTxt = sub.cycle.toLowerCase();
        if (sub.cycle === 'DAYS') cycleTxt = `${countMsg} day`;
        else if (sub.cycle === 'WEEKLY') cycleTxt = countMsg > 1 ? `${countMsg} week` : 'weekly';
        else if (sub.cycle === 'MONTHLY') cycleTxt = countMsg > 1 ? `${countMsg} month` : 'monthly';
        else if (sub.cycle === 'YEARLY') cycleTxt = countMsg > 1 ? `${countMsg} year` : 'yearly';
        
        await tx.message.create({
          data: {
            groupId: sub.groupId,
            userId: sub.payerId,
            text: `🔄 System automatically added the ${cycleTxt} ${sub.name} bill for ₹${sub.amount}.`
          }
        });

        // Update the nextBillingDate
        const nextDate = new Date(sub.nextBillingDate);
        const count = sub.intervalCount || 1;
        
        if (sub.cycle === 'DAYS') nextDate.setDate(nextDate.getDate() + count);
        else if (sub.cycle === 'WEEKLY') nextDate.setDate(nextDate.getDate() + (7 * count));
        else if (sub.cycle === 'MONTHLY') nextDate.setMonth(nextDate.getMonth() + count);
        else if (sub.cycle === 'YEARLY') nextDate.setFullYear(nextDate.getFullYear() + count);

        await tx.subscription.update({
          where: { id: sub.id },
          data: { nextBillingDate: nextDate }
        });
      });
    }

    console.log(`[CRON] Processed ${dueSubscriptions.length} subscriptions.`);
  } catch (error) {
    console.error('[CRON] Error processing subscriptions:', error);
  }
};

// Run every day at midnight
const initCronJobs = () => {
  cron.schedule('0 0 * * *', processSubscriptions);
  console.log('[CRON] Subscription Auto-Pay job scheduled.');
};

module.exports = { initCronJobs, processSubscriptions };

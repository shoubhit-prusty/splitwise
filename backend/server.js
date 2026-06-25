require('dotenv').config();
const app = require('./src/app');

const { initCronJobs } = require('./src/cron/subscription.cron');

const PORT = process.env.PORT || 5000;

// Initialize Cron Jobs
initCronJobs();

app.listen(PORT, () => {
  console.log(`\n🚀 Splitwise API running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health\n`);
});

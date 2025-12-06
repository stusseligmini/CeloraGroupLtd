const functions = require('firebase-functions');
const next = require('next');

// Load .env if present (recommended over deprecated functions.config())
require('dotenv').config();

const isDev = process.env.NODE_ENV !== 'production';
const app = next({ dev: isDev, conf: { distDir: '.next' } });
const handle = app.getRequestHandler();

exports.nextServer = functions.https.onRequest(async (req, res) => {
  try {
    await app.prepare();
    return handle(req, res);
  } catch (err) {
    console.error('Next SSR error', err);
    res.status(500).send('Internal Server Error');
  }
});
// ============================================================================
// CRON JOBS - Scheduled Functions
// ============================================================================

const cron = require('./cron');

exports.balanceSyncCron = cron.balanceSyncCron;
exports.transactionMonitorCron = cron.transactionMonitorCron;
exports.scheduledPaymentsCron = cron.scheduledPaymentsCron;


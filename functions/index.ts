import * as functions from 'firebase-functions';
import next from 'next';

// Boot Next.js inside Firebase Functions (Node 18)
const isDev = process.env.NODE_ENV !== 'production';
const app = next({ dev: isDev, conf: { distDir: '.next' } });
const handle = app.getRequestHandler();

export const nextServer = functions.https.onRequest(async (req, res) => {
  try {
    if (!app.isReady) await app.prepare();
    // Let Next handle all routes (pages/app router + assets)
    await handle(req, res);
  } catch (err) {
    console.error('Next SSR error', err);
    res.status(500).send('Internal Server Error');
  }
});

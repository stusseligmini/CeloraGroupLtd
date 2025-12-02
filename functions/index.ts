import * as functions from 'firebase-functions';
import next from 'next';
import * as path from 'path';

// Boot Next.js inside Firebase Functions (Node 20) with Next.js 16 support
const nextApp = next({
  dev: false,
  dir: path.join(__dirname),
  conf: {
    distDir: '.next',
  },
});

const handle = nextApp.getRequestHandler();

export const nextServer = functions.https.onRequest(async (req, res) => {
  try {
    await nextApp.prepare();
    return handle(req, res);
  } catch (err) {
    console.error('[Firebase Function] Next.js SSR error:', err);
    res.status(500).send('Internal Server Error');
  }
});

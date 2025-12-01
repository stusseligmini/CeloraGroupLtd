import { build } from 'esbuild';
import { mkdir, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
const extensionDir = path.join(rootDir, 'extension');
const distDir = path.join(extensionDir, 'dist');

dotenv.config({ path: path.join(rootDir, '.env') });
dotenv.config({ path: path.join(rootDir, '.env.local') });

const envVars = [
  'NODE_ENV',
  'NEXT_PUBLIC_API_BASE_URL',
  'NEXT_PUBLIC_APP_URL',
];

const define = Object.fromEntries(
  envVars.map((key) => [`process.env.${key}`, JSON.stringify(process.env[key] ?? '')])
);
define['process.env.NODE_ENV'] = JSON.stringify(process.env.NODE_ENV ?? 'production');

const aliasPlugin = {
  name: 'alias-imports',
  setup(buildInstance) {
    buildInstance.onResolve({ filter: /^@\// }, async (args) => {
      const pathWithoutAlias = args.path.slice(2);
      const basePath = path.join(rootDir, 'src', pathWithoutAlias);
      
      // Try different extensions
      const extensions = ['.tsx', '.ts', '.jsx', '.js', ''];
      for (const ext of extensions) {
        try {
          const testPath = basePath + ext;
          const { stat } = await import('node:fs/promises');
          await stat(testPath);
          return { path: testPath };
        } catch {
          continue;
        }
      }
      
      return { path: basePath };
    });
  },
};

async function run() {
  await rm(distDir, { recursive: true, force: true });
  await mkdir(distDir, { recursive: true });

  // Build popup script
  await build({
    entryPoints: [path.join(extensionDir, 'src', 'popup.tsx')],
    outfile: path.join(distDir, 'popup.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome110'],
    minify: true,
    sourcemap: false,
    jsx: 'automatic',
    define,
    plugins: [aliasPlugin],
  });

  console.log('✅ Extension popup bundle written to extension/dist/popup.js');

  // Build background service worker
  await build({
    entryPoints: [path.join(extensionDir, 'background', 'service-worker.js')],
    outfile: path.join(distDir, 'background', 'service-worker.js'),
    bundle: true,
    format: 'iife',
    platform: 'browser',
    target: ['chrome110'],
    minify: true,
    sourcemap: false,
    define,
  });

  console.log('✅ Extension background worker written to extension/dist/background/service-worker.js');
}

run().catch((error) => {
  console.error('❌ Failed to build extension bundle');
  console.error(error);
  process.exitCode = 1;
});


const { spawn } = require('child_process');
const { resolve, join } = require('path');
const { existsSync, mkdirSync, writeFileSync, rmSync } = require('fs');

const projectRoot = resolve(__dirname, '../../..');
const PORT = 61001;
const FRONTEND_DIST = resolve(projectRoot, 'frontend/dist/ui/browser');
let serverProcess = null;

async function setup() {
  // Build server if needed
  const { execSync } = require('child_process');
  const distIndex = resolve(projectRoot, 'backend/dist/index.js');
  if (!existsSync(distIndex)) {
    execSync('npx tsc --project tsconfig.server.json', { cwd: projectRoot, stdio: 'inherit' });
  }

  // Create temp directories
  const baseDir = resolve(projectRoot, 'tmp/.vibe-tracker-e2e-base');
  const docRoot = resolve(projectRoot, `tmp/.vibe-tracker-e2e-doc-${Date.now()}`);
  mkdirSync(baseDir, { recursive: true });
  mkdirSync(docRoot, { recursive: true });

  // Write config
  const config = {
    VIBE_TRACKER_PORT: PORT,
    VIBE_TRACKER_DOC_ROOT: docRoot,
    VIBE_TRACKER_TICKET_PREFIX: 'issue',
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: ['issue', 'feat', 'bug'],
    VIBE_TRACKER_TICKET_NUM_PATTERN: 'XXXXX',
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: 80,
  };
  writeFileSync(join(baseDir, 'vibe-ticket-tracker.json'), JSON.stringify(config, null, 2), 'utf-8');

  // Store port for test files
  global.__E2E_PORT = PORT;
  global.__E2E_DOC_ROOT = docRoot;

  // Start server
  serverProcess = spawn('node', [
    resolve(projectRoot, 'backend/dist/index.js'),
    baseDir,
    FRONTEND_DIST,
    String(PORT),
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', VIBE_TRACKER_VERSION: '9.9.9' },
  });

  serverProcess.stdout?.on('data', (data) => {
    process.stdout.write(`[e2e-server] ${data}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    process.stderr.write(`[e2e-server] ${data}`);
  });

  // Wait for server
  const url = `http://localhost:${PORT}/api/tickets`;
  for (let i = 0; i < 30; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  throw new Error(`Server at ${url} did not become healthy within 6000ms`);
}

module.exports = setup;

import { chromium } from 'playwright';

export async function setup(): Promise<void> {
  // Ensure server is built
  const { execSync } = await import('node:child_process');
  const { existsSync } = await import('node:fs');
  const { resolve } = await import('node:path');

  const projectRoot = resolve(__dirname, '..');
  const distIndex = resolve(projectRoot, 'dist/index.js');
  if (!existsSync(distIndex)) {
    execSync('npx tsc --project tsconfig.server.json', { cwd: projectRoot, stdio: 'inherit' });
  }

  const { mkdirSync, writeFileSync, rmSync, existsSync } = await import('node:fs');
  const { join } = await import('node:path');

  const PORT = 61001;
  const FRONTEND_DIST = resolve(projectRoot, '../frontend/dist/ui/browser');

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

  // Store globals for use in tests
  globalThis.__E2E_BASE_DIR = baseDir;
  globalThis.__E2E_DOC_ROOT = docRoot;
  globalThis.__E2E_PORT = PORT;

  // Start server
  const { spawn } = await import('node:child_process');
  const serverProcess = spawn('node', [
    resolve(projectRoot, 'dist/index.js'),
    baseDir,
    FRONTEND_DIST,
    String(PORT),
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test', VIBE_TRACKER_VERSION: '9.9.9' },
  });

  globalThis.__E2E_SERVER = serverProcess;

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

export async function teardown(): Promise<void> {
  const serverProcess = globalThis.__E2E_SERVER as ReturnType<typeof import('node:child_process').spawn> | undefined;
  const docRoot = globalThis.__E2E_DOC_ROOT as string | undefined;

  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    try {
      await new Promise<void>((resolve) => {
        serverProcess.once('exit', () => resolve());
        setTimeout(() => { serverProcess.kill('SIGKILL'); resolve(); }, 3000);
      });
    } catch { /* ignore */ }
  }

  if (docRoot) {
    try { rmSync(docRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

declare global {
  var __E2E_SERVER: ReturnType<typeof import('node:child_process').spawn> | undefined;
  var __E2E_PORT: number | undefined;
  var __E2E_DOC_ROOT: string | undefined;
  var __E2E_BASE_DIR: string | undefined;
}

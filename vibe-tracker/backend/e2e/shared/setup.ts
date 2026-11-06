import { spawn, ChildProcess } from 'node:child_process';
import { resolve, join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { existsSync, readFileSync, writeFileSync, rmSync, mkdirSync } from 'node:fs';
import { DEFAULT_CONFIG } from '../../src/storage/config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let serverProcess: ChildProcess | null = null;
let testBaseDir: string | null = null;
let testDocRoot: string | null = null;
let currentPort = DEFAULT_CONFIG.VIBE_TRACKER_PORT + 1; // 61001

let testFileCounter = 0;

/**
 * Resolve the workspace root (parent of backend/).
 */
function getProjectRoot(): string {
  return resolve(__dirname, '../../..');
}

/**
 * Path to the frontend built output.
 */
function getFrontendDist(): string {
  return resolve(getProjectRoot(), 'frontend/dist/ui/browser');
}

/**
 * Get a unique port for this test file. Increments per test file.
 */
function getTestPort(): number {
  return currentPort + testFileCounter++;
}

/**
 * Create a temporary doc root directory for e2e tests.
 */
function createTempDocRoot(): string {
  const timestamp = Date.now();
  const pid = process.pid;
  const dir = resolve(getProjectRoot(), `tmp/.vibe-tracker-e2e-${pid}-${timestamp}`);
  mkdirSync(dir, { recursive: true });
  return dir;
}

/**
 * Write a minimal config file for the test server.
 */
function writeTestConfig(baseDir: string, docRoot: string, port: number): void {
  const config = {
    VIBE_TRACKER_PORT: port,
    VIBE_TRACKER_DOC_ROOT: docRoot,
    VIBE_TRACKER_TICKET_PREFIX: 'issue',
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: ['issue', 'feat', 'bug'],
    VIBE_TRACKER_TICKET_NUM_PATTERN: 'XXXXX',
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: 80,
  };
  writeFileSync(join(baseDir, 'vibe-ticket-tracker.json'), JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Wait for the server to become healthy by polling a simple HTTP request.
 */
async function waitForServer(url: string, maxRetries = 30, delayMs = 200): Promise<void> {
  // Give the server process time to start
  await new Promise((r) => setTimeout(r, 500));
  for (let i = 0; i < maxRetries; i++) {
    try {
      const res = await fetch(url);
      if (res.ok) return;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, delayMs));
  }
  throw new Error(`Server at ${url} did not become healthy within ${maxRetries * delayMs}ms`);
}

/**
 * Kill the test server and clean up temp directories.
 */
async function cleanup(): Promise<void> {
  if (serverProcess) {
    serverProcess.kill('SIGTERM');
    try {
      await new Promise<void>((resolve) => {
        serverProcess!.once('exit', () => resolve());
        // Force kill after 3 seconds
        setTimeout(() => {
          serverProcess!.kill('SIGKILL');
          resolve();
        }, 3000);
      });
    } catch {
      // Ignore cleanup errors
    }
    serverProcess = null;
    // Wait for port to be released
    await new Promise((r) => setTimeout(r, 300));
  }
  if (testDocRoot && existsSync(testDocRoot)) {
    try { rmSync(testDocRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  if (testBaseDir && existsSync(testBaseDir)) {
    try { rmSync(testBaseDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

/**
 * Start the test server. Must be called once per process (in beforeAll).
 * Creates a temp doc root, writes a config, and spawns the server.
 */
export async function startTestServer(): Promise<void> {
  const port = getTestPort();

  // Build the server if needed
  const distIndex = resolve(getProjectRoot(), 'backend/dist/index.js');
  if (!existsSync(distIndex)) {
    const buildResult = spawn('npx', ['tsc', '--project', 'tsconfig.server.json'], {
      cwd: getProjectRoot(),
      stdio: 'pipe',
    });
    await new Promise<void>((resolve, reject) => {
      buildResult.on('exit', (code) => {
        if (code === 0) resolve();
        else reject(new Error(`TypeScript build failed with code ${code}`));
      });
    });
  }

  // Create isolated temp directories
  testBaseDir = resolve(getProjectRoot(), 'tmp/.vibe-tracker-e2e-base');
  testDocRoot = createTempDocRoot();
  mkdirSync(testBaseDir, { recursive: true });

  // Write test config with this test file's unique port
  writeTestConfig(testBaseDir, testDocRoot, port);

  // Start the server
  const backendDist = resolve(getProjectRoot(), 'backend/dist');
  const frontendDist = getFrontendDist();
  serverProcess = spawn('node', [
    join(backendDist, 'index.js'),
    testBaseDir,
    frontendDist,
    String(port),
  ], {
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, NODE_ENV: 'test' },
  });

  // Log server output for debugging
  serverProcess.stdout?.on('data', (data) => {
    process.stdout.write(`[e2e-server] ${data}`);
  });
  serverProcess.stderr?.on('data', (data) => {
    process.stderr.write(`[e2e-server] ${data}`);
  });

  // Wait for server to be ready on its unique port
  await waitForServer(`http://localhost:${port}/api/tickets`);
  // Update the module-level port reference so tests use the right port
  (globalThis as Record<string, unknown>).__E2E_TEST_PORT = port;
}

/**
 * Get the test server URL.
 */
export function getBaseUrl(): string {
  const port = (globalThis as Record<string, unknown>).__E2E_TEST_PORT as number ?? (DEFAULT_CONFIG.VIBE_TRACKER_PORT + 1);
  return `http://localhost:${port}`;
}

/**
 * Get the test doc root path (for verification).
 */
export function getTestDocRoot(): string | null {
  return testDocRoot;
}

/**
 * Get the test base directory path.
 */
export function getTestBaseDir(): string | null {
  return testBaseDir;
}

/**
 * Stop the test server. Must be called once per process (in afterAll).
 */
export async function stopTestServer(): Promise<void> {
  await cleanup();
}

/**
 * Cleanup all temp directories without killing the server (useful for debugging).
 */
export async function cleanupTempDirs(): Promise<void> {
  if (testDocRoot && existsSync(testDocRoot)) {
    try { rmSync(testDocRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  if (testBaseDir && existsSync(testBaseDir)) {
    try { rmSync(testBaseDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

import { test, expect } from 'playwright/test';
import { execSync } from 'child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readFileSync } from 'node:fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const E2E_VERSION = '9.9.9';
const E2E_VERSION_CLI = `v${E2E_VERSION}`;
const E2E_VERSION_FRONTEND = `v${E2E_VERSION}`;

const projectRoot = resolve(__dirname, '..', '..');

/** Read the bundled version from the built frontend index.html. */
function getBundledVersion(): string {
  const indexPath = resolve(projectRoot, 'frontend', 'dist', 'ui', 'browser', 'index.html');
  const html = readFileSync(indexPath, 'utf-8');
  const match = html.match(/window\.VIBE_TRACKER_VERSION\s*=\s*"([^"]+)"/);
  return match ? match[1] : 'dev';
}

test.describe('Version constant — backend & frontend', () => {

  // ── CLI help ──────────────────────────────────────────────────────

  test('CLI --help prints the version from the generated constant', async () => {
    const output = execSync('node dist-server/cli.js', {
      cwd: projectRoot,
      encoding: 'utf-8',
      env: { ...process.env, VIBE_TRACKER_VERSION: E2E_VERSION },
    });
    expect(output).toContain(E2E_VERSION_CLI);
  });

  // ── MCP endpoint ──────────────────────────────────────────────────

  test('MCP initialize returns the version from the server process', async ({ request }) => {
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'version-test',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          clientInfo: { name: 'e2e-version-test', version: '0.0.1' },
        },
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as Array<Record<string, unknown>>;
    const serverInfo = body[0]?.result?.serverInfo as Record<string, string> | undefined;
    expect(serverInfo?.version).toBe(E2E_VERSION);
  });

  // ── Frontend HTML source ──────────────────────────────────────────

  test('Frontend index.html contains the version script tag', async ({ request }) => {
    const res = await request.get('http://localhost:61001');
    expect(res.status()).toBe(200);
    const html = await res.text();
    // The HTML should contain the injected script with window.VIBE_TRACKER_VERSION
    expect(html).toContain('VIBE_TRACKER_VERSION');
  });

  // ── Frontend runtime (browser) ────────────────────────────────────

  test('Frontend footer displays the bundled version', async ({ page }) => {
    const bundledVersion = getBundledVersion();
    await page.goto('http://localhost:61001');
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toContain(bundledVersion);
  });

  test('Frontend footer displays overridden version via HTML rewrite (e2e)', async ({ page }) => {
    // Read the actual bundled version from the built HTML
    const bundledVersion = getBundledVersion();
    const indexPath = resolve(projectRoot, 'frontend', 'dist', 'ui', 'browser', 'index.html');
    const originalHtml = readFileSync(indexPath, 'utf-8');
    const modifiedHtml = originalHtml.replace(
      `window.VIBE_TRACKER_VERSION = "${bundledVersion}"`,
      `window.VIBE_TRACKER_VERSION = "${E2E_VERSION_FRONTEND}"`,
    );

    await page.route('**', async (route) => {
      const reqUrl = route.request().url();
      // Only intercept the root path that serves index.html (SPA fallback)
      if (reqUrl === 'http://localhost:61001/' || reqUrl === 'http://localhost:61001') {
        await route.fulfill({
          status: 200,
          contentType: 'text/html',
          body: modifiedHtml,
        });
      } else {
        await route.continue();
      }
    });
    await page.goto('http://localhost:61001');
    const footerText = await page.locator('footer').textContent();
    expect(footerText).toContain(E2E_VERSION_FRONTEND);
  });
});

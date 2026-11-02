#!/usr/bin/env node
/**
 * Inject version / dev SHA into the built index.html.
 * Run as a postbuild step.
 */
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const distDir = process.argv[2];
if (!distDir || !existsSync(distDir)) {
  console.error('Usage: inject-version <dist-dir>');
  process.exit(1);
}

const indexHtmlPath = resolve(distDir, 'index.html');
if (!existsSync(indexHtmlPath)) {
  console.error('index.html not found at', indexHtmlPath);
  process.exit(1);
}

// ── Determine version ──────────────────────────────────────────────────

// Read from vibe-tracker root package.json
const rootPkgPath = resolve(__dirname, '..', '..', 'package.json');
let version = '';
if (existsSync(rootPkgPath)) {
  try {
    version = JSON.parse(readFileSync(rootPkgPath, 'utf-8')).version || '';
  } catch { /* ignore */ }
}

// Get short git commit hash (or empty string if not a git repo)
let devSha = '';
try {
  devSha = execSync('git rev-parse --short HEAD', { cwd: resolve(__dirname, '..', '..'), stdio: 'pipe' }).toString().trim();
} catch {
  // Not in a git repo — skip dev SHA
}

const isRelease = version !== '';
const versionStr = isRelease ? `v${version}` : `dev (${devSha})`;

// ── Inject script tag into index.html ─────────────────────────────────

const indexHtml = readFileSync(indexHtmlPath, 'utf-8');

// Skip if already injected (idempotent)
if (indexHtml.includes('id="vibe-tracker-version"')) {
  console.log('Version already injected, skipping.');
  process.exit(0);
}

const injectScript = `<script id="vibe-tracker-version" type="text/javascript">
  window.VIBE_TRACKER_VERSION = ${isRelease ? `"${versionStr}"` : 'undefined'};
  window.VIBE_TRACKER_DEV_SHA = ${devSha ? `"${devSha}"` : 'undefined'};
</script>`;

// Insert just before </body>
const updatedHtml = indexHtml.replace('</body>', `${injectScript}\n  </body>`);
writeFileSync(indexHtmlPath, updatedHtml, 'utf-8');

console.log(`Injected version="${versionStr}" (release=${isRelease}) into ${indexHtmlPath}`);

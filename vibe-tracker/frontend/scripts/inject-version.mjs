#!/usr/bin/env node
/**
 * Inject version constants into backend and frontend.
 *
 * Modes (single argument):
 *   backend       — generates backend/dist/version.js  +  backend/src/version.d.ts
 *   frontend-ts   — generates frontend/src/version.ts
 *   frontend-html — injects <script> into frontend/dist/ui/browser/index.html
 *
 * The backend version.js supports runtime override via VIBE_TRACKER_VERSION env var.
 * The frontend version is a bundled constant; the HTML injection also sets
 * window.VIBE_TRACKER_VERSION for runtime override (e.g. in e2e tests via addInitScript).
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const projectRoot = resolve(__dirname, '..', '..');
const pkgPath = resolve(projectRoot, 'package.json');
const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
const version = pkg.version || '0.0.0';

const mode = process.argv[2];
if (!mode) {
  console.error('Usage: inject-version <backend|frontend-ts|frontend-html>');
  process.exit(1);
}

// ── Backend ────────────────────────────────────────────────────────

if (mode === 'backend') {
  // Runtime version.js in the dist output directory
  const distDir = resolve(projectRoot, 'backend', 'dist');
  mkdirSync(distDir, { recursive: true });
  const versionJs =
`// Auto-generated version file — do not edit.
const VIBE_TRACKER_VERSION = (process.env.VIBE_TRACKER_VERSION) || '${version}';
export { VIBE_TRACKER_VERSION };
`;
  writeFileSync(resolve(distDir, 'version.js'), versionJs, 'utf-8');

  // Type declaration in the source directory (TypeScript needs it for the .js import)
  const srcDir = resolve(projectRoot, 'backend', 'src');
  const versionDts = `export declare const VIBE_TRACKER_VERSION: string;
`;
  writeFileSync(resolve(srcDir, 'version.d.ts'), versionDts, 'utf-8');

  console.log(`[inject] backend  version="${version}"  (dist/version.js + src/version.d.ts)`);
}

// ── Frontend (TypeScript source) ───────────────────────────────────

if (mode === 'frontend-ts' || mode === 'frontend') {
  const srcDir = resolve(projectRoot, 'frontend', 'src');
  const isRelease = version !== '0.0.0';
  const versionStr = isRelease ? `v${version}` : 'dev';
  const versionTs =
`// Auto-generated version file — do not edit.
export const VIBE_TRACKER_VERSION = '${versionStr}';
`;
  writeFileSync(resolve(srcDir, 'version.ts'), versionTs, 'utf-8');
  console.log(`[inject] frontend-ts version="${versionStr}"`);
}

// ── Frontend (HTML injection, post-build) ──────────────────────────

if (mode === 'frontend-html') {
  const isRelease = version !== '0.0.0';
  const versionStr = isRelease ? `v${version}` : 'dev';
  const indexPath = resolve(projectRoot, 'frontend', 'dist', 'ui', 'browser', 'index.html');
  if (existsSync(indexPath)) {
    const indexHtml = readFileSync(indexPath, 'utf-8');
    if (!indexHtml.includes('id="vibe-version"')) {
      const injectScript = `<script id="vibe-version" type="text/javascript">
  window.VIBE_TRACKER_VERSION = ${isRelease ? `"${versionStr}"` : 'undefined'};
  window.VIBE_TRACKER_DEV_SHA = undefined;
</script>`;
      const updatedHtml = indexHtml.replace('</body>', `${injectScript}\n  </body>`);
      writeFileSync(indexPath, updatedHtml, 'utf-8');
    }
    console.log(`[inject] frontend-html version="${versionStr}"`);
  } else {
    console.log('[inject] frontend HTML not found — skipping injection.');
  }
}

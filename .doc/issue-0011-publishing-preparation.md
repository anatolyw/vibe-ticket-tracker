---
id: issue-0011
title: Publishing Preparation
type: issue
status: closed
created: 2026-11-02
updated: 2026-11-02
---
# Publishing Preparation

## Overview

Prepared the Vibe Ticket Tracker project for publishing to www.npmjs.com. Adjusted code to version 1.0.0. Build artifacts are generated at publish time via `prepack`/`prepublishOnly` — nothing is committed to git.

## Files Created

| File | Purpose |
|------|---------|
| `LICENSE` | MIT license file (Copyright 2025 Anatoly Weinstein) |
| `.npmignore` | Excludes source code, node_modules, dev files from the package |
| `frontend/scripts/inject-version.mjs` | Injects version/commit into built index.html at build time |
| `dist-server/` | Copied at `prepack`/`prepublishOnly` — contains compiled TypeScript server |
| `dist-ui/` | Copied at `prepack`/`prepublishOnly` — contains built Angular UI |

## Files Modified

### `package.json`
- **Version**: Bumped from `0.1.0` to `1.0.0`
- **Description**: Updated to "Local ticket tracking system for vibe coding — CLI + Express API with MCP support"
- **Main**: Set to `./dist-server/index.js`
- **Files**: Updated to include `dist-server/` and `dist-ui/` (generated at publish time)
- **Scripts**:
  - Removed `postinstall`, `dev`, `start`, `init` scripts (not needed for published package)
  - Added `prepack` — conditionally builds if output missing, copies to `dist-server/` and `dist-ui/`, injects version
  - Added `prepublishOnly` — same as `prepack`
  - `clean` — removes all build output from root + backend + frontend
- **Added fields**:
  - `repository` — points to `git+https://github.com/anatolyw/vibe-ticket-tracker.git`
  - `keywords` — ticketing, tracking, cli, mcp, vibe-coding, opencode, agent, task-management, local-first
  - `author` — Anatoly Weinstein (https://github.com/anatolyw)
  - `license` — MIT
  - `engines` — `node >= 18.0.0`
  - `dependencies` — cors, express, js-yaml, jsonschema, marked, yaml (runtime deps)

### `README.md`
- Made standalone (no longer references root README)
- Added quick start section
- Added CLI usage documentation
- Added full API reference
- Added MCP endpoints documentation
- Added project structure section
- Added license notice
- Updated references from `AGENTS.md` to `VIBE-TICKET-TRACKER-AGENTS.md`

### `backend/bin/vibe-ticket-tracker.cjs`
- Updated spawn path from `../dist/cli.js` to `../../dist-server/cli.js`

### `backend/dist/cli.js` (compiled)
- Version string updated to `v1.0.0`
- Added `dist-ui/` as first candidate in `generateUIDistPath()` function (for published package path)
- Path resolution: `dirname(dirname(cliPath))` — only 2 levels up (was 3)
- Template path: `dirname(cliPath)` — only 1 level up (was 2)
- AGENTS.md references updated to `VIBE-TICKET-TRACKER-AGENTS.md`
- Init summary updated to `npx vibe-ticket-tracker start`

### `backend/src/cli.ts` (source)
- Same source-level updates as compiled `cli.js`

### `backend/src/mcp/index.ts` (source)
- MCP protocol version updated to `1.0.0`

### `frontend/src/components/app-header/app-header.component.ts`
- **Theme toggle icon swap**: When `isDark()` is true (dark mode), now shows Moon icon (to switch to light). When `isDark()` is false (light mode), shows Sun icon (to switch to dark). Previously the icons were swapped.
- Removed `[class.text-muted-foreground]="!isDark()"` attribute binding.

### `frontend/src/app.component.ts`
- **Dynamic version**: Added `getVersion()` function that reads `window.VIBE_TRACKER_VERSION` (set at build time) or falls back to `window.VIBE_TRACKER_DEV_SHA` for dev builds.
- Footer now uses `{{ version() }}` instead of hardcoded `v0.1.0`.

### `VIBE-TICKET-TRACKER-SKILL-TEMPLATE.md`
- Version metadata updated from `'1.0'` to `'1.0.0'`

### `.gitignore`
- Added `dist-server/` and `dist-ui/` to prevent build artifacts from being committed

## Package Contents (31 files, ~452 KB unpacked)

These are the files that end up in the published npm tarball:

```
LICENSE
README.md
VIBE-TICKET-TRACKER-AGENTS-TEMPLATE.md
VIBE-TICKET-TRACKER-SKILL-TEMPLATE.md
backend/bin/vibe-ticket-tracker.cjs
dist-server/api/tickets.d.ts
dist-server/api/tickets.js
dist-server/cli.d.ts
dist-server/cli.js
dist-server/index.d.ts
dist-server/index.js
dist-server/mcp/index.d.ts
dist-server/mcp/index.js
dist-server/storage/config.d.ts
dist-server/storage/config.js
dist-server/storage/ticket-schema.json
dist-server/storage/ticket.d.ts
dist-server/storage/ticket.js
dist-ui/chunk-7X6QJMMJ.js
dist-ui/chunk-BOON7ECW.js
dist-ui/chunk-BQEYWK6Z.js
dist-ui/chunk-BV63TPE5.js
dist-ui/chunk-C4FUE7SA.js
dist-ui/chunk-FJHQVSSA.js
dist-ui/chunk-NXVMDF7X.js
dist-ui/favicon.svg
dist-ui/index.html
dist-ui/main-U6OORQDR.js
dist-ui/polyfills-5CFQRCPP.js
dist-ui/styles-JRT6P2LG.css
package.json
```

## `.npmignore` Details

The `.npmignore` file excludes the following from the npm package:
- `node_modules/` — all dependency directories
- Source code (`backend/src/`, `frontend/src/`, `frontend/e2e/`)
- Build configuration files (`angular.json`, `tsconfig*.json`)
- Development files (`.env*`, `opencode.jsonc`, `AGENTS.md`)
- Test artifacts (`test-results/`, `tmp/`, `*.log`)
- IDE and OS files
- Angular cache directories
- Backend sub-project files (`e2e/`, `node_modules/`, `package*.json`, `playwright.config.ts`, `README.md`, `tsconfig*.json`, `src/`)
- Frontend sub-project files (`node_modules/`, `package*.json`, `playwright.config.ts`, `postcss.config.*`, `public/`, `README.md`, `src/`, `e2e/`)

## Lifecycle Scripts Reference

| Script | When it runs | Purpose |
|--------|-------------|---------|
| `prepack` | Before `npm pack` | Checks if `backend/dist` and `frontend/dist/ui/browser` exist. If missing, runs `npm run build`. Then copies output to `dist-server/` and `dist-ui/`, injects version into `index.html` |
| `prepublishOnly` | Before `npm publish` | Same as `prepack` — conditionally builds, copies, and injects before uploading to npm |
| `build:server` | Manual or via lifecycle | Compiles TypeScript server |
| `build:ui` | Manual or via lifecycle | Builds Angular UI (non-fatal if `lightningcss` + Node 22 incompatible) |
| `build` | Manual or via lifecycle | Runs both server + UI builds |
| `clean` | Manual | Removes all build output from root + backend + frontend |

## How Publishing Works

The `prepack` and `prepublishOnly` scripts run automatically:

```bash
# During npm pack (local testing)
npm pack
# → prepack runs:
#   1. Checks if backend/dist AND frontend/dist/ui/browser exist
#   2. If either is missing → runs npm run build
#   3. Copies backend/dist/* → dist-server/
#   4. Copies frontend/dist/ui/browser/* → dist-ui/
#   5. Runs inject-version.mjs to put version into dist-ui/index.html
#   6. Creates tarball

# During npm publish (actual publish)
npm publish
# → prepublishOnly runs same steps → creates tarball → uploads to registry
```

This ensures:
- **No stale builds** — if output directories are missing, everything is rebuilt from source
- **Clean git history** — no build artifacts cluttering the repo
- **Smaller repo** — no 200+ KB of Angular chunks in git
- **Standard npm pattern** — packages like webpack, jest, and eslint use the same approach

**Note:** `npm pack` and `npm publish` require `npm install` (both root + backend + frontend) to be run first so build tools are available. On a fresh clone without a build:

```bash
cd /workspace/vibe-tracker
npm install && cd frontend && npm install && cd ../backend && npm install && cd ..
npm pack  # ← will trigger the conditional build
```

### Version Display Logic

The footer shows the version dynamically based on what was built:
- **Release build**: Shows `v1.0.0` (from package.json version)
- **Dev build**: Shows `dev (abc1234)` (from git commit short SHA)

The version is injected into `dist-ui/index.html` during the build step by `inject-version.mjs`, which sets `window.VIBE_TRACKER_VERSION` or `window.VIBE_TRACKER_DEV_SHA`. The Angular component reads these globals at runtime.

### Theme Toggle Icon Behavior

- **Light mode** (default): Shows ☀ Sun icon — clicking switches to dark mode
- **Dark mode**: Shows 🌙 Moon icon — clicking switches to light mode

## What Users Install

When users run `npm install vibe-ticket-tracker`, they receive:
- A `vibe-ticket-tracker` CLI command (via `bin` field)
- The compiled Express server
- The built Angular UI
- No source code, no `node_modules`, no build tools
- Runtime dependencies (express, cors, etc.) installed automatically

## How Developers Use It

```bash
# Normal development — build locally
npm run build

# Create a test tarball (prepack handles build + copy + version injection)
# Requires install first so build tools are available
npm install && cd frontend && npm install && cd ../backend && npm install && cd ..
npm pack

# Test locally from the tarball
mkdir /tmp/test-vt && cd /tmp/test-vt
npm init -y
npm install /workspace/vibe-tracker/vibe-ticket-tracker-1.0.0.tgz
npx vibe-ticket-tracker --help

# Clean everything
npm run clean

# When ready to publish
npm publish
# prepublishOnly runs automatically — builds (if needed), copies, injects version
```

#!/usr/bin/env node
'use strict';
// This is the compiled CLI entry point.
// Source at src/server/index.ts

const { execSync, spawn } = require('child_process');
const { resolve, join } = require('path');
const { readFileSync, writeFileSync, existsSync } = require('fs');

const DEFAULT_PORT = 61000;
const DEFAULT_PREFIX = 'issue';
const DEFAULT_DOC_ROOT = '.vibe-tracker';

function getConfig(baseDir) {
  const configPath = resolve(baseDir, 'vibe-tracker.json');
  if (existsSync(configPath)) {
    return JSON.parse(readFileSync(configPath, 'utf-8'));
  }
  return {
    VIBE_TRACKER_PORT: DEFAULT_PORT,
    VIBE_TRACKER_DOC_ROOT: DEFAULT_DOC_ROOT,
    VIBE_TRACKER_TICKET_PREFIX: DEFAULT_PREFIX,
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: ['issue', 'feat', 'bug'],
    VIBE_TRACKER_TICKET_NUM_PATTERN: 'XXXXX',
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: 80,
  };
}

function initCommand(baseDir, port) {
  const config = {
    VIBE_TRACKER_PORT: port || DEFAULT_PORT,
    VIBE_TRACKER_DOC_ROOT: DEFAULT_DOC_ROOT,
    VIBE_TRACKER_TICKET_PREFIX: DEFAULT_PREFIX,
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: ['issue', 'feat', 'bug'],
    VIBE_TRACKER_TICKET_NUM_PATTERN: 'XXXXX',
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: 80,
  };
  const configPath = resolve(baseDir, 'vibe-tracker.json');
  writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n', 'utf-8');
  console.log(`Config created at ${configPath}`);

  // Create doc root
  const docRoot = resolve(baseDir, config.VIBE_TRACKER_DOC_ROOT);
  if (!existsSync(docRoot)) {
    require('fs').mkdirSync(docRoot, { recursive: true });
  }
  console.log(`Ticket directory created at ${docRoot}`);

  // Add npm scripts
  const pkgPath = resolve(baseDir, 'package.json');
  if (existsSync(pkgPath)) {
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
    const p = config.VIBE_TRACKER_PORT;
    if (!pkg.scripts) pkg.scripts = {};
    pkg.scripts['vibe:init'] = 'vibe-tracker init';
    pkg.scripts['vibe:start'] = 'vibe-tracker start';
    pkg.scripts['vibe'] = 'vibe-tracker start';
    pkg.scripts['vibe:open'] = `open http://localhost:${p} || xdg-open http://localhost:${p} || start http://localhost:${p}`;
    writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
    console.log('Helper scripts added to package.json');
  }

  console.log('\nNext steps:');
  console.log('  vibe-tracker start    — Start the server');
  console.log(`  npm run vibe:open     — Open in browser (port ${config.VIBE_TRACKER_PORT})`);
}

function startCommand(baseDir) {
  const config = getConfig(baseDir);
  const port = config.VIBE_TRACKER_PORT || DEFAULT_PORT;
  console.log('Starting Vibe Tracker...');

  // Start the Express server (from compiled dist)
  const serverPath = resolve(__dirname, '..', 'dist', 'index.js');
  // UI dist is inside the vibe-tracker package, not the project
  // Angular 19+ outputs to dist/ui/browser/ (flat if older Angular)
  const potentialBase = resolve(__dirname, '..', '..', 'frontend', 'dist', 'ui');
  let uiDistPath = resolve(potentialBase, 'browser', 'index.html');
  if (existsSync(uiDistPath)) {
    // Angular 19+: files in dist/ui/browser/
    uiDistPath = resolve(potentialBase, 'browser');
  } else {
    uiDistPath = potentialBase; // fallback: flat output
  }
  if (existsSync(serverPath)) {
    const child = spawn('node', [serverPath, baseDir, uiDistPath, String(port)], {
      stdio: 'inherit',
      env: { ...process.env, VIBE_TRACKER_BASE_DIR: baseDir, VIBE_TRACKER_PORT: String(port) },
    });
    child.on('close', (code) => process.exit(code));
  } else {
    console.error('Server not found. Run "npm run build:server" first.');
    process.exit(1);
  }
}

// Simple CLI argument parser
const args = process.argv.slice(2);
const command = args[0];
const baseDir = process.cwd();

if (command === 'init') {
  const portMatch = args.find(a => a.startsWith('-p=') || a.startsWith('--port='));
  const port = portMatch ? parseInt(portMatch.split('=')[1]) : undefined;
  initCommand(baseDir, port);
} else if (command === 'start') {
  startCommand(baseDir);
} else {
  console.log('Vibe Tracker v0.1.0');
  console.log('Usage:');
  console.log('  vibe-tracker init [-p <port>]   Initialize in current project');
  console.log('  vibe-tracker start              Start the server');
  console.log(`Default port: ${DEFAULT_PORT}`);
}

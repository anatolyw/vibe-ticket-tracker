#!/usr/bin/env node
/**
 * Thin wrapper that delegates to the compiled TypeScript CLI.
 * Source at backend/src/cli.ts
 */
const { spawn } = require('child_process');
const path = require('path');

spawn(process.execPath, [
  path.resolve(__dirname, '..', 'dist', 'cli.js'),
  ...process.argv.slice(2),
], { stdio: 'inherit' });

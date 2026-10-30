#!/usr/bin/env node

import { Command } from 'commander';
import { readFileSync, writeFileSync, existsSync, mkdirSync, appendFileSync } from 'node:fs';
import { resolve, join } from 'node:path';
import { spawn, execSync } from 'node:child_process';
import { createApp, startServer } from './src/server/index.js';
import { loadConfig, initConfig, DEFAULT_CONFIG } from './src/storage/config.js';
import { getDocRoot, getNextNumber, createTicket } from './src/storage/ticket.js';

const program = new Command();

program
  .name('vibe-tracker')
  .description('Local ticket tracking for vibe coders')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize vibe-tracker in the current project')
  .option('-p, --port <number>', 'Port number', String(DEFAULT_CONFIG.VIBE_TRACKER_PORT))
  .action((options: { port?: string }) => {
    const port = parseInt(options.port || String(DEFAULT_CONFIG.VIBE_TRACKER_PORT));
    const configPath = initConfig(process.cwd(), port);
    console.log(`Config created at ${configPath}`);

    // Create doc root
    const docRoot = getDocRoot({ ...DEFAULT_CONFIG, VIBE_TRACKER_PORT: port }, process.cwd());
    console.log(`Ticket directory created at ${docRoot}`);

    // Add npm scripts if package.json exists
    const pkgPath = resolve(process.cwd(), 'package.json');
    if (existsSync(pkgPath)) {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const scripts = {
        'vibe:init': 'vibe-tracker init',
        'vibe:start': 'vibe-tracker start',
        'vibe': 'vibe-tracker start',
        'vibe:open': `open http://localhost:${port} || xdg-open http://localhost:${port} || start http://localhost:${port}`,
      };
      if (!pkg.scripts) pkg.scripts = {};
      for (const [key, value] of Object.entries(scripts)) {
        pkg.scripts[key] = value;
      }
      writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n', 'utf-8');
      console.log('Helper scripts added to package.json');
    }

    console.log('\nNext steps:');
    console.log(`  vibe-tracker start    — Start the server`);
    console.log(`  npm run vibe:open     — Open in browser`);
  });

program
  .command('start')
  .description('Start the Vibe Tracker server')
  .option('-p, --port <number>', 'Port number')
  .option('--dev', 'Development mode (watch angular)')
  .action(async (options: { port?: string; dev?: boolean }) => {
    const config = loadConfig();
    const port = options.port ? parseInt(options.port) : config.VIBE_TRACKER_PORT;

    console.log('Starting Vibe Tracker...');

    // Build Angular UI
    const uiDir = resolve(process.cwd(), 'frontend', 'src', 'ui');
    const distDir = resolve(process.cwd(), 'dist', 'ui');

    // Find angular.json or use project root
    let projectRoot = process.cwd();
    let angularJson = null;
    const candidates = [
      join(projectRoot, 'frontend', 'angular.json'),
      join(projectRoot, '..', 'vibe-tracker', 'frontend', 'angular.json'),
    ];
    for (const candidate of candidates) {
      if (existsSync(candidate)) {
        angularJson = candidate;
        projectRoot = resolve(candidate, '..');
        break;
      }
    }

    // Build Angular
    try {
      console.log('Building Angular UI...');
      const buildCmd = `ng build ui --output-path ${distDir} --configuration production`;
      execSync(buildCmd, {
        cwd: projectRoot,
        stdio: 'inherit',
        env: { ...process.env, NG_PRESERVE_SYMLINKS: '1' },
      });
      console.log('Angular UI built successfully.');
    } catch {
      console.error('Warning: Angular build failed. Starting without UI.');
    }

    // Create and start Express app
    const app = createApp(config, projectRoot, distDir);
    startServer(app, port);
  });

program.parse();

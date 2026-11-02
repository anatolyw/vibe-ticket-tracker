#!/usr/bin/env node
/**
 * Consolidated CLI entry point for vibe-tracker.
 * Handles `init` (interactive wizard) and `start` commands.
 */

import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import {
  readFileSync,
  writeFileSync,
  existsSync,
  mkdirSync,
  renameSync,
  cpSync,
  statSync,
} from 'node:fs';
import { resolve, join, relative } from 'node:path';
import { spawn } from 'child_process';
import { createApp, startServer } from './index.js';
import {
  loadConfig,
  initConfig,
  DEFAULT_CONFIG,
  generateJSONCConfig,
  type VibeTrackerConfig,
} from './storage/config.js';

// ESM-compatible __cliDir
const __filename = fileURLToPath(import.meta.url);
const __cliDir = dirname(__filename);

// ── Color helpers ────────────────────────────────────────────────────

const C = {
  reset: '\x1b[0m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  bold: '\x1b[1m',
};

function c(color: string, text: string): string {
  return `${color}${text}${C.reset}`;
}
function question(text: string): string {
  return c(C.cyan, '❯ ') + c(C.bold, text + ' ');
}
function success(text: string): string {
  return c(C.green, '✓ ') + text;
}
function warn(text: string): string {
  return c(C.yellow, '⚠ ') + text;
}

// ── Prompt helpers ───────────────────────────────────────────────────

const rl = createInterface({ input: process.stdin, output: process.stdout });
function ask(q: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question(q), (a) => resolve(a.trim()));
  });
}

function askYesNo(q: string): Promise<boolean> {
  return new Promise((resolve) => {
    rl.question(question(`${q} (y/N)`), (a) => {
      resolve(/^y(es)?$/i.test(a));
    });
  });
}

function closeRl(): void {
  rl.close();
}

// ── Helpers ──────────────────────────────────────────────────────────

function readTemplate(name: string): string {
  const cliPath = resolve(__cliDir, 'cli.js');
  const base = dirname(cliPath); // dist-server/
  // Templates are shipped at package root, one level above dist-server/
  const templateDir = resolve(base, '..');
  const path = resolve(templateDir, name);
  if (!existsSync(path)) {
    console.error(warn(`Template not found: ${path}`));
    process.exit(1);
  }
  return readFileSync(path, 'utf-8');
}

function writeJSONC(path: string, content: string): void {
  const dir = dirname(path);
  if (dir !== '.' && !existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  writeFileSync(path, content, 'utf-8');
}

function generateOpencodeConfig(port: number, skillPath: string): string {
  const skillRel = './' + relative('.', skillPath);
  return JSON.stringify(
    {
      $schema: 'https://opencode.ai/config.json',
      mcp: {
        servers: {
          'vibe-tracker': {
            type: 'remote',
            url: `http://localhost:${port}/mcp`,
            oauth: false,
          },
        },
      },
      instructions: [
        './VIBE-TRACKER-AGENTS.md',
        skillRel,
      ],
    },
    null,
    2,
  ) + '\n';
}

function mergeOpencode(existing: string, port: number, skillPath: string): string {
  try {
    const parsed: Record<string, unknown> = JSON.parse(existing);
    const agentsPath = './VIBE-TRACKER-AGENTS.md';

    // Handle instructions array — add ./VIBE-TRACKER-AGENTS.md and skill path if not present
    if (Array.isArray(parsed.instructions)) {
      const instructions = parsed.instructions as string[];
      // Remove old references
      const filtered = instructions.filter((i: string) => i !== agentsPath);
      parsed.instructions = [...filtered, agentsPath];
      const skillRel = './' + relative('.', skillPath);
      if (!filtered.includes(skillRel)) {
        (parsed.instructions as string[]).push(skillRel);
      }
    } else {
      parsed.instructions = [agentsPath, './' + relative('.', skillPath)];
    }

    // V2 schema: mcp.servers
    if (parsed.mcp && typeof parsed.mcp === 'object' && !Array.isArray(parsed.mcp)) {
      const mcp = parsed.mcp as Record<string, unknown>;
      if (!mcp.servers || typeof mcp.servers !== 'object' || Array.isArray(mcp.servers)) {
        mcp.servers = {};
      }
      (mcp.servers as Record<string, unknown>)['vibe-tracker'] = {
        type: 'remote',
        url: `http://localhost:${port}/mcp`,
        oauth: false,
      };
    } else {
      // V1 or no mcp key — convert to V2
      parsed.mcp = {
        servers: {
          'vibe-tracker': {
            type: 'remote',
            url: `http://localhost:${port}/mcp`,
            oauth: false,
          },
        },
      };
    }

    return JSON.stringify(parsed, null, 2) + '\n';
  } catch {
    // Fall back to overwrite if invalid JSON
    return generateOpencodeConfig(port, skillPath);
  }
}

// ── UI helpers ───────────────────────────────────────────────────────

function generateUIDistPath(): string {
  // Find UI dist relative to vibe-tracker package root
  const cliPath = resolve(__cliDir, 'cli.js');
  const pkgRoot = dirname(dirname(cliPath)); // dist-server/ -> package root (e.g., node_modules/vibe-tracker/)
  const candidates = [
    resolve(pkgRoot, 'dist-ui'),
    resolve(pkgRoot, 'frontend', 'dist', 'ui', 'browser'),
    resolve(pkgRoot, 'frontend', 'dist', 'ui'),
    resolve(pkgRoot, 'frontend', 'dist'),
  ];
  for (const c of candidates) {
    if (existsSync(c)) return c;
  }
  return resolve(pkgRoot, 'dist-ui');
}

// ── Init command ─────────────────────────────────────────────────────

async function runInit(baseDir: string, portFlag?: number): Promise<void> {
  console.log(c(C.bold, '\n═══ Vibe Tracker Initialize ═══\n'));

  const base = resolve(baseDir);
  const hasPortFlag = portFlag !== undefined;
  let port = portFlag ?? DEFAULT_CONFIG.VIBE_TRACKER_PORT;

  // Step 1: Port ──────────────────────────────────────────────────
  if (!hasPortFlag) {
    let valid = false;
    while (!valid) {
      const input = await ask('What port should the Vibe Tracker server use? (61000-62000, default: 61000)');
      if (input === '') {
        port = DEFAULT_CONFIG.VIBE_TRACKER_PORT;
        valid = true;
      } else {
        const n = parseInt(input, 10);
        if (Number.isInteger(n) && n >= 61000 && n <= 62000) {
          port = n;
          valid = true;
        } else {
          console.error(warn('Invalid port. Enter a number between 61000 and 62000.'));
        }
      }
    }
  }

  // Check for existing config
  const jsoncPath = resolve(base, 'vibe-tracker.jsonc');
  const jsonPath = resolve(base, 'vibe-tracker.json');
  let existingConfig: string | null = null;
  let existingPath = '';
  if (existsSync(jsonPath)) {
    existingConfig = readFileSync(jsonPath, 'utf-8');
    existingPath = jsonPath;
  } else if (existsSync(jsoncPath)) {
    existingConfig = readFileSync(jsoncPath, 'utf-8');
    existingPath = jsoncPath;
  }

  if (existingConfig) {
    const overwrite = await askYesNo('Existing config found at \'' + existingPath + '\'. Overwrite?');
    if (overwrite) {
      const bak = existingPath + '.bak';
      renameSync(existingPath, bak);
      console.log(success(`Backed up → ${bak}`));
    } else {
      console.log('\n' + c(C.yellow, 'Overwrite manually:'));
      console.log('─────────────────────────────────────');
      const config: VibeTrackerConfig = {
        ...DEFAULT_CONFIG,
        VIBE_TRACKER_PORT: port,
      };
      console.log(generateJSONCConfig(config));
      console.log('─────────────────────────────────────\n');
    }
  }

  // Write config
  const configPath = initConfig(base, port, true); // prefer jsonc
  console.log(success(`Config written → ${configPath}`));

  // Create doc root
  const docRoot = resolve(base, DEFAULT_CONFIG.VIBE_TRACKER_DOC_ROOT);
  if (!existsSync(docRoot)) {
    mkdirSync(docRoot, { recursive: true });
  }
  console.log(success(`Ticket directory → ${docRoot}`));

  // ── Step 2: Skill path (needed for MCP config instructions) ─────────
  const skillDefault = '.opencode/skills/vibe-tracker.md';
  const skillInput = await ask('Where should the Vibe Tracker skill file be placed? (default: ' + skillDefault + ')');
  const skillPath = skillInput ? resolve(base, skillInput) : resolve(base, skillDefault);

  // ── Step 3: MCP config ────────────────────────────────────────
  const opencodePath = resolve(base, 'opencode.jsonc');
  let mcpGenerated = false;
  let skillGenerated = false;

  const generateMcp = await askYesNo('Generate opencode.jsonc MCP configuration?');
  if (generateMcp) {
    const mcpContent = generateOpencodeConfig(port, skillPath);
    if (existsSync(opencodePath)) {
      const existing = readFileSync(opencodePath, 'utf-8');
      const overwriteMcp = await askYesNo('Existing ' + opencodePath + ' found. Update MCP entry?');
      if (overwriteMcp) {
        const merged = mergeOpencode(existing, port, skillPath);
        const bak = opencodePath + '.bak';
        renameSync(opencodePath, bak);
        console.log(success(`Backed up → ${bak}`));
        writeJSONC(opencodePath, merged);
        mcpGenerated = true;
      } else {
        console.log('\n' + c(C.yellow, 'Save manually:'));
        console.log(mcpContent);
      }
    } else {
      writeJSONC(opencodePath, mcpContent);
      console.log(success(`MCP config written → ${opencodePath}`));
      mcpGenerated = true;
    }

    // Write skill file (it's referenced in the MCP config instructions)
    const template = readTemplate('VIBE-TRACKER-SKILL-TEMPLATE.md');
    writeJSONC(skillPath, template);
    console.log(success(`Skill written → ${skillPath}`));
    skillGenerated = true;
  } else {
    console.log('  Skipping MCP config. Add manually to your IDE config.');
    console.log('  Skill file will be created next.');
  }

  // ── Step 4: Skill file (skip if already written in Step 3) ─────────

  if (!skillGenerated) {
    if (existsSync(skillPath)) {
      const overwriteSkill = await askYesNo('Skill file at \'' + skillPath + '\' already exists. Overwrite?');
      if (overwriteSkill) {
        const template = readTemplate('VIBE-TRACKER-SKILL-TEMPLATE.md');
        writeJSONC(skillPath, template);
        console.log(success(`Skill written → ${skillPath}`));
        skillGenerated = true;
      } else {
        console.log('\n' + c(C.yellow, 'Save manually:'));
        const template = readTemplate('VIBE-TRACKER-SKILL-TEMPLATE.md');
        console.log(template);
      }
    } else {
      const template = readTemplate('VIBE-TRACKER-SKILL-TEMPLATE.md');
      writeJSONC(skillPath, template);
      console.log(success(`Skill written → ${skillPath}`));
      skillGenerated = true;
    }
  }

  // ── Step 4: VIBE-TRACKER-AGENTS.md ──────────────────────────────────
  const agentsPath = resolve(base, 'VIBE-TRACKER-AGENTS.md');
  let agentsGenerated = false;

  if (existsSync(agentsPath)) {
    const overwriteAgents = await askYesNo('VIBE-TRACKER-AGENTS.md at \'' + agentsPath + '\' already exists. Overwrite?');
    if (overwriteAgents) {
      const bak = agentsPath + '.bak';
      renameSync(agentsPath, bak);
      console.log(success(`Backed up → ${bak}`));
      const template = readTemplate('VIBE-TRACKER-AGENTS-TEMPLATE.md');
      const withPort = template.replace(/{PORT}/g, String(port));
      writeFileSync(agentsPath, withPort, 'utf-8');
      console.log(success(`VIBE-TRACKER-AGENTS.md written → ${agentsPath}`));
      agentsGenerated = true;
    } else {
      console.log('\n' + c(C.yellow, 'Save manually:'));
      const template = readTemplate('VIBE-TRACKER-AGENTS-TEMPLATE.md');
      console.log(template.replace(/{PORT}/g, String(port)));
    }
  } else {
    const createAgents = await askYesNo('Create VIBE-TRACKER-AGENTS.md with Vibe Tracker workflow?');
    if (createAgents) {
      const template = readTemplate('VIBE-TRACKER-AGENTS-TEMPLATE.md');
      const withPort = template.replace(/{PORT}/g, String(port));
      writeFileSync(agentsPath, withPort, 'utf-8');
      console.log(success(`VIBE-TRACKER-AGENTS.md written → ${agentsPath}`));
      agentsGenerated = true;
    }
  }

  // ── Step 5: Summary ───────────────────────────────────────────
  console.log('\n' + c(C.bold, '═══ Setup Complete ═══\n'));
  console.log(c(C.bold, 'Next steps:'));
  console.log(`  ${c(C.green, 'npx vibe-tracker start')}    — Start the server`);
  console.log(`  Open in browser http://localhost:${port}`);

  if (agentsGenerated) {
    console.log(`  Agent file → ${c(C.bold, 'VIBE-TRACKER-AGENTS.md')}`);
  }
  if (skillGenerated) {
    const skillRel = relative(base, skillPath);
    console.log(`  Skill file → ${c(C.bold, skillRel)}`);
  }
  if (mcpGenerated) {
    console.log(`  MCP config for OpenCode → ${c(C.bold, 'opencode.jsonc')}`);
  }

  console.log('');
}

// ── Start command ────────────────────────────────────────────────────

function runStart(baseDir: string, portFlag?: number, devMode?: boolean): void {
  const config = loadConfig(baseDir);
  const port = portFlag ?? config.VIBE_TRACKER_PORT;
  console.log('Starting Vibe Tracker...');

  // Resolve paths
  const cliPath = resolve(__cliDir, 'cli.js');
  const base = resolve(__cliDir, '..'); // backend/dist → backend
  const serverPath = resolve(__cliDir, 'index.js'); // backend/dist/index.js

  // Find UI dist
  const uiDistPath = generateUIDistPath();

  if (devMode) {
    // Dev mode: directly create and start Express app (no child process)
    try {
      const app = createApp(config, baseDir, uiDistPath);
      startServer(app, port);
    } catch (err) {
      console.error('Failed to start server:', err);
      process.exit(1);
    }
  } else if (existsSync(serverPath)) {
    // Spawn the compiled server
    const child = spawn('node', [serverPath, baseDir, uiDistPath, String(port)], {
      stdio: 'inherit',
      env: {
        ...process.env,
        VIBE_TRACKER_BASE_DIR: baseDir,
        VIBE_TRACKER_PORT: String(port),
      },
    });
    child.on('close', (code) => process.exit(code ?? 0));
  } else {
    console.error('Server not found. Run "npm run build:server" first.');
    process.exit(1);
  }
}

// ── CLI entry ────────────────────────────────────────────────────────

const args = process.argv.slice(2);
const command = args[0];
const baseDir = process.cwd();

function parsePortFlag(args: string[]): number | undefined {
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    // Handle -p=61000, --port=61000
    if (a.startsWith('-p=') || a.startsWith('--port=')) {
      return parseInt(a.split('=')[1], 10);
    }
    // Handle -p 61000, --port 61000
    if (a === '-p' || a === '--port') {
      const next = args[i + 1];
      if (next && /^\d+$/.test(next)) {
        return parseInt(next, 10);
      }
    }
  }
  return undefined;
}

if (command === 'init') {
  const port = parsePortFlag(args);
  runInit(baseDir, port).then(closeRl).catch((err) => {
    console.error('Error:', err);
    closeRl();
    process.exit(1);
  });
} else if (command === 'start') {
  const port = parsePortFlag(args);
  const devMode = args.includes('--dev');
  runStart(baseDir, port, devMode);
} else {
  console.log(c(C.bold, 'Vibe Tracker v1.0.0'));
  console.log(c(C.bold, 'Usage:'));
  console.log(`  ${c(C.bold, 'npx vibe-tracker init')}  [--port <n>]   Initialize in current project`);
  console.log(`  ${c(C.bold, 'npx vibe-tracker start')}  [--port <n>] [--dev]  Start the server`);
  console.log(`  ${c(C.bold, 'npx vibe-tracker --help')}  Show this help`);
  console.log(`\n${c(C.yellow, 'Interactive init wizard:')}
  npx vibe-tracker init
  npx vibe-tracker init -p 61001
`);
  closeRl();
}

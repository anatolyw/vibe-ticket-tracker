import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve, join } from 'node:path';

export interface VibeTrackerConfig {
  VIBE_TRACKER_PORT: number;
  VIBE_TRACKER_DOC_ROOT: string;
  VIBE_TRACKER_TICKET_PREFIX: string;
  VIBE_TRACKER_TICKET_TYPE_OPTIONS: string[];
  VIBE_TRACKER_TICKET_NUM_PATTERN: string;
  VIBE_TRACKER_TICKET_SUFFIX_LENGTH: number;
}

export const DEFAULT_CONFIG: VibeTrackerConfig = {
  VIBE_TRACKER_PORT: 61000,
  VIBE_TRACKER_DOC_ROOT: '.vibe-tracker',
  VIBE_TRACKER_TICKET_PREFIX: 'issue',
  VIBE_TRACKER_TICKET_TYPE_OPTIONS: ['issue', 'feat', 'bug'],
  VIBE_TRACKER_TICKET_NUM_PATTERN: 'XXXXX',
  VIBE_TRACKER_TICKET_SUFFIX_LENGTH: 80,
};

// JSONC file names — check .jsonc first, then .json as fallback
const CONFIG_FILE_NAMES = ['vibe-ticket-tracker.jsonc', 'vibe-ticket-tracker.json'];

/**
 * Parse a JSONC string: strip // line comments (outside strings) and trailing commas.
 */
export function parseJSONC(text: string): unknown {
  // Remove line comments that are NOT inside quoted strings.
  // The regex matches either a double-quoted string or a comment, and discards comments.
  const withoutComments = text.replace(
    /"((?:[^"\\]|\\.)*)"/g,
    (fullMatch) => fullMatch, // keep quoted strings as-is
  ).replace(/\/\/.*$/gm, ''); // now strip // comments on remaining text

  // Remove trailing commas before } or ]
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[\]}])/g, '$1');

  return JSON.parse(withoutTrailingCommas);
}

/**
 * Find the config file (.jsonc preferred, then .json) in baseDir and its parent.
 */
export function findConfigFile(baseDir: string = process.cwd()): string | null {
  const cwd = resolve(baseDir);
  const candidates = [cwd, join(cwd, '..')];
  for (const dir of candidates) {
    for (const name of CONFIG_FILE_NAMES) {
      const path = join(dir, name);
      if (existsSync(path)) return path;
    }
  }
  return null;
}

/**
 * Load and merge config from the found JSONC/JSON file with defaults.
 */
export function loadConfig(baseDir: string = process.cwd()): VibeTrackerConfig {
  const configPath = findConfigFile(baseDir);
  if (!configPath) return { ...DEFAULT_CONFIG };
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = parseJSONC(raw) as Partial<VibeTrackerConfig>;
  return {
    VIBE_TRACKER_PORT: parsed.VIBE_TRACKER_PORT ?? DEFAULT_CONFIG.VIBE_TRACKER_PORT,
    VIBE_TRACKER_DOC_ROOT: parsed.VIBE_TRACKER_DOC_ROOT ?? DEFAULT_CONFIG.VIBE_TRACKER_DOC_ROOT,
    VIBE_TRACKER_TICKET_PREFIX: parsed.VIBE_TRACKER_TICKET_PREFIX ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_PREFIX,
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: parsed.VIBE_TRACKER_TICKET_TYPE_OPTIONS ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_TYPE_OPTIONS,
    VIBE_TRACKER_TICKET_NUM_PATTERN: parsed.VIBE_TRACKER_TICKET_NUM_PATTERN ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_NUM_PATTERN,
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: parsed.VIBE_TRACKER_TICKET_SUFFIX_LENGTH ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_SUFFIX_LENGTH,
  };
}

/**
 * Generate a JSONC config string with a comment on the port line.
 */
export function generateJSONCConfig(config: VibeTrackerConfig): string {
  const lines = [
    '{',
    `  "VIBE_TRACKER_PORT": ${config.VIBE_TRACKER_PORT}, // WARNING: If you change this port, update your MCP server configuration (e.g., opencode.jsonc) to match`,
    `  "VIBE_TRACKER_DOC_ROOT": ${JSON.stringify(config.VIBE_TRACKER_DOC_ROOT)},`,
    `  "VIBE_TRACKER_TICKET_PREFIX": ${JSON.stringify(config.VIBE_TRACKER_TICKET_PREFIX)},`,
    `  "VIBE_TRACKER_TICKET_TYPE_OPTIONS": ${JSON.stringify(config.VIBE_TRACKER_TICKET_TYPE_OPTIONS)},`,
    `  "VIBE_TRACKER_TICKET_NUM_PATTERN": ${JSON.stringify(config.VIBE_TRACKER_TICKET_NUM_PATTERN)},`,
    `  "VIBE_TRACKER_TICKET_SUFFIX_LENGTH": ${config.VIBE_TRACKER_TICKET_SUFFIX_LENGTH}`,
    '}',
  ];
  return lines.join('\n') + '\n';
}

/**
 * Normalize a ticket type string:
 * - Trim leading/trailing whitespace
 * - Replace internal runs of whitespace with a single underscore
 */
export function normalizeTicketType(raw: string): string {
  return raw.trim().replace(/\s+/g, '_');
}

/**
 * Write a new config file, handling .jsonc/.json rename/backup.
 */
export function initConfig(
  baseDir: string = process.cwd(),
  port: number = DEFAULT_CONFIG.VIBE_TRACKER_PORT,
  preferJSONC: boolean = true,
): string {
  const config: VibeTrackerConfig = {
    ...DEFAULT_CONFIG,
    VIBE_TRACKER_PORT: port,
  };
  const targetName = preferJSONC ? 'vibe-ticket-tracker.jsonc' : 'vibe-ticket-tracker.json';
  const configPath = resolve(baseDir, targetName);
  const content = generateJSONCConfig(config);
  writeFileSync(configPath, content, 'utf-8');
  return configPath;
}

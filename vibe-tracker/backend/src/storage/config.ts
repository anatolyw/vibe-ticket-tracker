import { existsSync, readFileSync } from 'node:fs';
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

const CONFIG_FILE_NAME = 'vibe-tracker.json';

export function findConfigFile(baseDir: string = process.cwd()): string | null {
  const cwd = resolve(baseDir);
  const candidates = [cwd, join(cwd, '..')];
  for (const dir of candidates) {
    const path = join(dir, CONFIG_FILE_NAME);
    if (existsSync(path)) return path;
  }
  return null;
}

export function loadConfig(baseDir: string = process.cwd()): VibeTrackerConfig {
  const configPath = findConfigFile(baseDir);
  if (!configPath) return { ...DEFAULT_CONFIG };
  const raw = readFileSync(configPath, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<VibeTrackerConfig>;
  return {
    VIBE_TRACKER_PORT: parsed.VIBE_TRACKER_PORT ?? DEFAULT_CONFIG.VIBE_TRACKER_PORT,
    VIBE_TRACKER_DOC_ROOT: parsed.VIBE_TRACKER_DOC_ROOT ?? DEFAULT_CONFIG.VIBE_TRACKER_DOC_ROOT,
    VIBE_TRACKER_TICKET_PREFIX: parsed.VIBE_TRACKER_TICKET_PREFIX ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_PREFIX,
    VIBE_TRACKER_TICKET_TYPE_OPTIONS: parsed.VIBE_TRACKER_TICKET_TYPE_OPTIONS ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_TYPE_OPTIONS,
    VIBE_TRACKER_TICKET_NUM_PATTERN: parsed.VIBE_TRACKER_TICKET_NUM_PATTERN ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_NUM_PATTERN,
    VIBE_TRACKER_TICKET_SUFFIX_LENGTH: parsed.VIBE_TRACKER_TICKET_SUFFIX_LENGTH ?? DEFAULT_CONFIG.VIBE_TRACKER_TICKET_SUFFIX_LENGTH,
  };
}

export function initConfig(baseDir: string = process.cwd(), port: number = DEFAULT_CONFIG.VIBE_TRACKER_PORT): string {
  const config: VibeTrackerConfig = {
    ...DEFAULT_CONFIG,
    VIBE_TRACKER_PORT: port,
  };
  const configPath = resolve(baseDir, CONFIG_FILE_NAME);
  const content = JSON.stringify(config, null, 2) + '\n';
  import('node:fs').then(({ writeFileSync }) => {
    writeFileSync(configPath, content, 'utf-8');
  });
  return configPath;
}

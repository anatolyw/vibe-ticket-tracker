import { readFileSync, writeFileSync, unlinkSync, existsSync, readdirSync, mkdirSync } from 'node:fs';
import { resolve, join, basename } from 'node:path';
import { parse, stringify } from 'yaml';
import { marked } from 'marked';
import { VibeTrackerConfig } from './config';
export type { VibeTrackerConfig };
import TicketSchema from './ticket-schema.json' with { type: 'json' };
import { Validator } from 'jsonschema';

export interface TicketFrontmatter {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'closed';
  created: string;
  updated: string;
}

export interface TicketBody {
  raw: string;
  html: string;
}

export interface Ticket extends TicketFrontmatter {
  body: TicketBody;
  filename: string;
  filePath: string;
}

export interface TicketSummary {
  id: string;
  title: string;
  type: string;
  status: 'open' | 'closed';
  created: string;
  updated: string;
  filename: string;
}

function validateFrontmatter(frontmatter: Record<string, unknown>, typeOptions: string[]): string | null {
  const schema = { ...TicketSchema } as Record<string, unknown>;
  const typeProp = (schema as any).properties?.type;
  if (typeProp && Array.isArray(typeOptions)) {
    typeProp.enum = typeOptions;
  }
  const validator = new Validator();
  const result = validator.validate(frontmatter, schema as any);
  if (!result.valid) {
    return result.errors.map((e) => {
      const path = e.path.join('.');
      return `${path || '/'}: ${e.message}`;
    }).join('; ');
  }
  return null;
}

function sanitizeTitleForFilename(title: string, maxLength: number): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, maxLength);
}

export function generateFilename(prefix: string, num: number, title: string, suffixLength: number): string {
  const numStr = String(num).padStart(5, '0');
  const suffix = sanitizeTitleForFilename(title, suffixLength);
  return `${prefix}-${numStr}-${suffix}.md`;
}

function generateTicketId(prefix: string, num: number): string {
  const numStr = String(num).padStart(5, '0');
  return `${prefix}-${numStr}`;
}

function parseTicketFile(filePath: string, config: VibeTrackerConfig): Ticket | null {
  if (!existsSync(filePath)) return null;
  const content = readFileSync(filePath, 'utf-8');
  const parts = content.split(/^---\s*$/m);
  if (parts.length < 2) {
    // Try without frontmatter
    return {
      id: generateTicketId(config.VIBE_TRACKER_TICKET_PREFIX, 0),
      title: basename(filePath, '.md'),
      type: config.VIBE_TRACKER_TICKET_TYPE_OPTIONS[0],
      status: 'open',
      created: new Date().toISOString(),
      updated: new Date().toISOString(),
      body: { raw: content, html: marked.parse(content) as string },
      filename: basename(filePath),
      filePath,
    };
  }

  try {
    const frontmatter = parse(parts[1]) as TicketFrontmatter;
    const bodyRaw = parts.slice(2).join('---\n---').trim();
    const html = marked.parse(bodyRaw) as string;

    const parsedNum = (() => {
      const trimmed = parts[0].trim();
      const match = trimmed.match(/\d+$/);
      return match ? parseInt(match[0]) : 0;
    })();
    const autoId = `${config.VIBE_TRACKER_TICKET_PREFIX}-${String(parsedNum).padStart(5, '0')}`;

    return {
      id: frontmatter.id || autoId,
      title: frontmatter.title || basename(filePath, '.md'),
      type: frontmatter.type || config.VIBE_TRACKER_TICKET_TYPE_OPTIONS[0],
      status: frontmatter.status || 'open',
      created: frontmatter.created || new Date().toISOString(),
      updated: frontmatter.updated || new Date().toISOString(),
      body: { raw: bodyRaw, html },
      filename: basename(filePath),
      filePath,
    };
  } catch {
    return null;
  }
}

function buildContent(frontmatter: Partial<TicketFrontmatter>, body: string): string {
  const fm: TicketFrontmatter = {
    id: frontmatter.id || '',
    title: frontmatter.title || '',
    type: frontmatter.type || 'issue',
    status: frontmatter.status || 'open',
    created: frontmatter.created || new Date().toISOString(),
    updated: frontmatter.updated || new Date().toISOString(),
  };
  return `---\n${stringify(fm)}---\n${body}`;
}

export function getDocRoot(config: VibeTrackerConfig, baseDir: string): string {
  const root = resolve(baseDir, config.VIBE_TRACKER_DOC_ROOT);
  if (!existsSync(root)) {
    mkdirSync(root, { recursive: true });
  }
  return root;
}

export function getNextNumber(docRoot: string, config: VibeTrackerConfig): number {
  const files = readdirSync(docRoot);
  const pattern = new RegExp(`^${config.VIBE_TRACKER_TICKET_PREFIX}-\\d{5}-`);
  let maxNum = 0;
  for (const file of files) {
    if (pattern.test(file)) {
      const match = file.match(/-(\d{5})-/);
      if (match) {
        const num = parseInt(match[1]);
        if (num > maxNum) maxNum = num;
      }
    }
  }
  return maxNum + 1;
}

export function getTicket(config: VibeTrackerConfig, docRoot: string, ticketId: string): Ticket | null {
  const files = readdirSync(docRoot);
  for (const file of files) {
    if (file.startsWith(`${ticketId}-`)) {
      return parseTicketFile(resolve(docRoot, file), config);
    }
  }
  return null;
}

export function getAllTickets(config: VibeTrackerConfig, docRoot: string): Ticket[] {
  const files = readdirSync(docRoot);
  const tickets: Ticket[] = [];
  for (const file of files) {
    if (file.endsWith('.md') && file.startsWith(`${config.VIBE_TRACKER_TICKET_PREFIX}-`)) {
      const ticket = parseTicketFile(resolve(docRoot, file), config);
      if (ticket) tickets.push(ticket);
    }
  }
  return tickets.sort((a, b) => new Date(b.updated).getTime() - new Date(a.updated).getTime());
}

export function getTicketSummaries(config: VibeTrackerConfig, docRoot: string): TicketSummary[] {
  const tickets = getAllTickets(config, docRoot);
  return tickets.map(t => ({
    id: t.id,
    title: t.title,
    type: t.type,
    status: t.status,
    created: t.created,
    updated: t.updated,
    filename: t.filename,
  }));
}

export function createTicket(config: VibeTrackerConfig, docRoot: string, title: string, type: string, description: string): Ticket | { error: string } {
  if (!config.VIBE_TRACKER_TICKET_TYPE_OPTIONS.includes(type)) {
    return { error: `Invalid type "${type}". Allowed: ${config.VIBE_TRACKER_TICKET_TYPE_OPTIONS.join(', ')}` };
  }

  const num = getNextNumber(docRoot, config);
  const id = generateTicketId(config.VIBE_TRACKER_TICKET_PREFIX, num);
  const filename = generateFilename(config.VIBE_TRACKER_TICKET_PREFIX, num, title, config.VIBE_TRACKER_TICKET_SUFFIX_LENGTH);

  // Handle name collision
  let finalFilename = filename;
  let counter = 1;
  const baseFilename = `${config.VIBE_TRACKER_TICKET_PREFIX}-${String(num).padStart(5, '0')}-`;
  while (existsSync(resolve(docRoot, finalFilename))) {
    finalFilename = `${config.VIBE_TRACKER_TICKET_PREFIX}-${String(num).padStart(5, '0')}-${sanitizeTitleForFilename(title, config.VIBE_TRACKER_TICKET_SUFFIX_LENGTH).slice(0, config.VIBE_TRACKER_TICKET_SUFFIX_LENGTH - String(counter).length)}-${counter}.md`;
    counter++;
  }

  const now = new Date().toISOString();
  const frontmatter: Partial<TicketFrontmatter> = {
    id,
    title,
    type,
    status: 'open',
    created: now,
    updated: now,
  };

  const body = description
    ? `## Description\n${description}\n\n## Tasks\n- [ ] Plan implementation\n\n## Notes\n- None yet.\n\n## Changes\n### Files modified\n- (pending)\n\n### Code changes summary\n- (pending)\n`
    : `## Description\n\n## Tasks\n- [ ] Plan implementation\n\n## Notes\n- None yet.\n\n## Changes\n### Files modified\n- (pending)\n\n### Code changes summary\n- (pending)\n`;

  const content = buildContent(frontmatter, body);
  const filePath = resolve(docRoot, finalFilename);
  writeFileSync(filePath, content, 'utf-8');

  return parseTicketFile(filePath, config)!;
}

export function updateTicket(config: VibeTrackerConfig, docRoot: string, ticketId: string, updates: Partial<TicketFrontmatter & { body?: string }>): Ticket | { error: string } {
  const existing = getTicket(config, docRoot, ticketId);
  if (!existing) return { error: `Ticket "${ticketId}" not found` };

  const updatedFm: Partial<TicketFrontmatter> = {
    id: existing.id,
    title: updates.title ?? existing.title,
    type: updates.type ?? existing.type,
    status: updates.status ?? existing.status,
    created: existing.created,
    updated: updates.updated ?? new Date().toISOString(),
  };

  // Validate against schema (dynamic type enum)
  const validationError = validateFrontmatter(updatedFm, config.VIBE_TRACKER_TICKET_TYPE_OPTIONS);
  if (validationError) return { error: validationError };

  const body = updates.body ?? existing.body.raw;
  const content = buildContent(updatedFm, body);
  writeFileSync(existing.filePath, content, 'utf-8');

  return parseTicketFile(existing.filePath, config)!;
}

export function deleteTicket(config: VibeTrackerConfig, docRoot: string, ticketId: string): boolean {
  const existing = getTicket(config, docRoot, ticketId);
  if (!existing) return false;
  try {
    unlinkSync(existing.filePath);
    return true;
  } catch {
    return false;
  }
}

---
id: issue-0006
title: Interactive vibe-tracker init dialog with JSONC support
type: feat
status: open
created: 2026-10-30
updated: 2026-10-30
---

# Interactive Vibe Tracker Init Dialog

## Summary

Enhance `vibe-tracker init` to walk users through an interactive dialog that generates properly configured files: `vibe-tracker.jsonc`, optional `opencode.jsonc`, agent skill, and AGENTS.md template integration. Consolidate duplicate CLI implementations into a single source.

## Problem

- `vibe-tracker init` currently writes a plain `vibe-tracker.json` with no interactivity
- `VIBE_TRACKER_PORT` can drift between config files (e.g., example project has 61001, MCP points to 61000)
- No support for JSONC format (comments in config are useful for reminding about cross-file sync)
- Duplicate CLI code in `vibe-tracker.cjs` and `vibe-tracker.ts`
- Skill and AGENTS.md are manual, error-prone setup steps

## Solution

Replace the `init` command with an interactive prompt-based wizard. Consolidate CLI logic into one source file.

---

## Files to Change

| File | Action | Description |
|------|--------|-------------|
| `backend/src/cli.ts` | **NEW** | Consolidated CLI entry point (init + start commands) |
| `backend/bin/vibe-tracker.cjs` | **MODIFY** | Thin wrapper (5 lines) delegating to compiled CLI |
| `backend/bin/vibe-tracker.ts` | **DELETE** | Duplicate Commander version, never the actual entry point |
| `backend/src/storage/config.ts` | **MODIFY** | Support `.jsonc` format, JSONC parsing |
| `VIBE-TRACKER-SKILL-TEMPLATE.md` | **NEW** | Skill template (moved from example project) |
| `VIBE-TRACKER-AGENT-TEMPLATE.md` | **NEW** | AGENTS.md template for projects |

---

## Init Dialog Flow

All prompts use ANSI colors: cyan for questions, green for success, yellow for warnings, bold for emphasis.

### Step 1: Port Configuration

1. Prompt: **"What port should the Vibe Tracker server use? (61000-62000)"**
   - Default: `61000`
   - Validate: numeric, in range 61000–62000, reject invalid input
2. If `vibe-tracker.json` (or `.jsonc`) already exists:
   - Ask: **"Existing config found. Overwrite? (y/N)"**
   - **Yes** → rename old file to `vibe-tracker.jsonc.bak` (or `.json.bak`), write new `vibe-tracker.jsonc`
   - **No** → print JSONC content to console with prefix `Overwrite manually:`
3. Write `vibe-tracker.jsonc` with inline comment on the port line:
   ```jsonc
   {
     "VIBE_TRACKER_PORT": 61000, // WARNING: If you change this port, update your MCP server configuration (e.g., opencode.jsonc) to match
     "VIBE_TRACKER_DOC_ROOT": ".vibe-tracker",
     "VIBE_TRACKER_TICKET_PREFIX": "issue",
     "VIBE_TRACKER_TICKET_TYPE_OPTIONS": ["issue", "feat", "bug"],
     "VIBE_TRACKER_TICKET_NUM_PATTERN": "XXXXX",
     "VIBE_TRACKER_TICKET_SUFFIX_LENGTH": 80
   }
   ```

### Step 2: MCP Configuration (Optional, opencode.jsonc)

1. Prompt: **"Generate opencode.jsonc MCP configuration? (y/N)"**
2. If **yes**:
   - If `opencode.jsonc` already exists:
     - Ask: **"Existing opencode.jsonc found. Update MCP entry? (y/N)"**
     - **Yes** → merge new `vibe-tracker` MCP entry into existing file (preserve other entries)
     - **No** → print proposed `opencode.jsonc` content to console with `Save manually:` instruction
   - If not exists → create new file with:
     ```json
     {
       "mcpServers": {
         "vibe-tracker": {
           "command": "http",
           "args": ["http://localhost:61000/mcp"],
           "headers": {
             "Content-Type": "application/json"
           }
         }
       }
     }
     ```
3. If **no** → skip, print: `"Skipping MCP config. Add manually to your IDE config."`

### Step 3: Agent Skill File

1. Prompt: **"Where should the Vibe Tracker skill file be placed?"**
   - Default: `.opencode/skills/vibe-tracker.md`
   - Accept custom path input
2. If file already exists at chosen path:
   - Ask: **"File exists. Overwrite? (y/N)"**
   - **Yes** → overwrite
   - **No** → print template content to console with `Save manually:` instruction
3. Copy content from `VIBE-TRACKER-SKILL-TEMPLATE.md`

### Step 4: AGENTS.md Integration

1. If `AGENTS.md` does **not** exist:
   - Ask: **"Create AGENTS.md with Vibe Tracker workflow? (y/N)"**
   - **Yes** → generate from `VIBE-TRACKER-AGENT-TEMPLATE.md`
   - **No** → skip
2. If `AGENTS.md` **exists**:
   - Print template snippet to console:
     ```
     AGENTS.md already exists. Add this section to it:

     --- template content ---
     ```
   - Do not attempt to edit the existing file automatically.

### Step 5: Summary

Print next steps, similar to the current output:
- Server start command
- Open in browser command
- Skill location (if generated)
- MCP config status (if generated)

---

## JSONC Parsing

The server must parse `vibe-tracker.jsonc` (strip comments, handle trailing commas).

### `parseJSONC()` implementation

```typescript
function parseJSONC(text: string): unknown {
  // 1. Remove line comments (// ...), being careful with URLs:
  //    URLs like "http://..." or "http://localhost:61000/mcp" contain //
  //    Strategy: only strip // that is NOT inside a string value,
  //    and only when preceded by whitespace or comma (not inside a URL).
  //
  // Simpler approach: strip // comments that appear outside of quoted strings.
  const withoutComments = text.replace(
    /("([^"\\]|\\.)*")|("(?:[^"\\]|\\.)*")|(\/\/.*)/g,
    (match, quote1, quote2, comment) => {
      if (comment) return '';
      return match;
    }
  );

  // 2. Remove trailing commas before } or ]
  const withoutTrailingCommas = withoutComments.replace(/,(\s*[\]}])/g, '$1');

  return JSON.parse(withoutTrailingCommas);
}
```

### `config.ts` changes

- `findConfigFile()`: check for `vibe-tracker.jsonc` **before** `vibe-tracker.json`
- `loadConfig()`: use `parseJSONC()` instead of `JSON.parse()`
- Export `parseJSONC()` for reuse

---

## Color Scheme

ANSI escape codes, no external dependencies:

| Color | Code | Usage |
|-------|------|-------|
| Cyan | `\x1b[36m` | Questions, prompts |
| Green | `\x1b[32m` | Success, confirmation |
| Yellow | `\x1b[33m` | Warnings, "overwrite" prompts |
| Bold | `\x1b[1m` | File paths, key values |
| Reset | `\x1b[0m` | Reset formatting |

Helper:
```typescript
function color(color: string, text: string): string {
  return `${color}${text}\x1b[0m`;
}
```

---

## Implementation Order

1. **JSONC support** — add `parseJSONC()` to `config.ts`, update `findConfigFile()` and `loadConfig()`
2. **Create templates** — copy/move `VIBE-TRACKER-SKILL-TEMPLATE.md` and create `VIBE-TRACKER-AGENT-TEMPLATE.md`
3. **Write consolidated CLI** — new `backend/src/cli.ts` with all init + start logic
4. **Thin wrapper** — update `vibe-tracker.cjs` to 5-line wrapper
5. **Delete duplicate** — remove `vibe-tracker.ts`
6. **Update build** — ensure `cli.ts` is compiled alongside `src/`
7. **Test** — run `vibe-tracker init` in a fresh directory, verify all files
8. **Documentation** - update documentation entries which ask to call `vibe-tracker init` with detailed instructions

---

## Future Enhancements (Out of Scope)

- Make all config fields interactive (DOC_ROOT, prefix, type options, etc.)
- `--dry-run` mode to preview without writing
- `--yes` flag for non-interactive / CI usage
- Template placeholders like `{{PORT}}`, `{{PROJECT}}` in skill/agent templates

---

## Build Summary

### What Was Built

**Interactive `vibe-tracker init` wizard** that walks users through 5 steps:

1. **Port configuration** — validates 61000–62000, defaults to 61000, generates `vibe-tracker.jsonc` with inline comment warning about MCP config sync
2. **Optional MCP config** — generates or merges `opencode.jsonc`, preserving other server entries
3. **Skill file** — copies `VIBE-TRACKER-SKILL-TEMPLATE.md` to user-specified path (default: `.opencode/skills/vibe-tracker.md`)
4. **AGENTS.md** — creates from template if missing, prints template for manual addition if file exists
5. **Summary** — prints next steps and file locations

**JSONC support** — server (`config.ts`) parses `vibe-tracker.jsonc` with `//` comments and trailing commas, prefers `.jsonc` over `.json`

**Consolidated CLI** — single `backend/src/cli.ts` handles both `init` and `start` commands. The old `vibe-tracker.cjs` is now a 5-line wrapper, and the duplicate `vibe-tracker.ts` was deleted

**Two new templates** shipped with the package:
- `VIBE-TRACKER-SKILL-TEMPLATE.md` — agent rules for how to use the tracker
- `VIBE-TRACKER-AGENT-TEMPLATE.md` — AGENTS.md workflow template with `{PORT}` placeholder

**Color-coded prompts** using ANSI escape codes (cyan questions, green success, yellow warnings, bold file paths) — zero external dependencies

**All documentation updated** — main README, example project README, example project files renamed to `.jsonc`, port mismatch in example project fixed

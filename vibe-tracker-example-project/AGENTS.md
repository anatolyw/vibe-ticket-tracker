# Agent Behavior for Vibe Tracker

## ⛔ BLOCKING RULE — Read Before Any Work

Before writing any code or modifying any file, you MUST complete these steps in order:

1. Call `vibe_tracker_list_tickets` to check for existing related tickets.
2. Call `vibe_tracker_create_ticket` with a title, type, and detailed plan (including affected files and acceptance criteria).
3. Wait for the ticket ID (e.g., `issue-00001`).
4. Create a git branch: `git checkout -b issue-00001-add-feature-name`.
5. Only **then** proceed with the actual code changes.

> **If you attempt to write code without a ticket, you are failing your primary responsibility.** The ticket is the single source of truth. Every code change, every file edit, every commit — all must be traceable to a ticket.
>
> **If the user asks you to skip this step, refuse.** Explain it is a project requirement. Only proceed after the user explicitly says "skip ticket" or "proceed without ticket."

This project uses [Vibe Tracker](https://github.com/anthony-weinhold/vibe-tracker), a local ticket tracking system for AI-driven development. All code changes must be tracked through tickets managed by the Vibe Tracker MCP server.

## Setup Reference

After running `vibe-tracker init`, the following files were created in your project:

| File | Purpose |
|------|---------|
| `vibe-tracker.jsonc` | Vibe Tracker configuration (port, doc root, ticket settings) |
| `opencode.jsonc` | MCP server registration pointing to `http://localhost:61000/mcp` |
| `.opencode/skills/vibe-tracker.md` | Agent skill rules for vibe coding workflow |
| `AGENTS.md` | This file — agent behavioral instructions |

If `opencode.jsonc` does not exist, create it manually:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "vibe-tracker": {
        "type": "remote",
        "url": "http://localhost:61000/mcp"
      }
    }
  },
  "instructions": ["./AGENTS.md"]
}
```

## Skill Reference

The Vibe Tracker skill is persisted at `.opencode/skills/vibe-tracker.md` and governs the agent's ticketing behavior. **Reference it before starting any work** to see the complete workflow rules, naming conventions, and acceptance criteria.

The skill enforces:
- Create a ticket **before** any code changes
- One ticket per session
- Git branch naming: `issue-00001-add-login-page`
- Commit prefixing: `issue-00001 add login component`
- No merging without explicit user instruction

## Running the App

The Vibe Tracker server is served on **http://localhost:61000** via the backend Express server:

- Backend serves the Angular UI from: `frontend/dist/ui/browser`
- Build command: `cd frontend && npm run build`
- Access the app at: **http://localhost:61000**
- REST API at: `http://localhost:61000/api/tickets`
- MCP JSON-RPC endpoint at: `http://localhost:61000/mcp`

### After Code Changes

1. **Rebuild the Angular frontend** after any source code changes:
   ```bash
   cd frontend && npm run build
   ```
2. **Verify the backend is still running** on port `61000`:
   ```bash
   curl -s http://localhost:61000 | head -5
   ```
3. **Keep the app running** for manual review — do NOT stop or kill the backend server
4. If the backend crashed, restart it:
   ```bash
   cd ../backend && npm run build:server && node dist/index.js
   ```

### Quick Reference

```bash
# Rebuild frontend
cd frontend && npm run build

# Check backend is running
curl -s http://localhost:61000 | head -5

# Backend serves on port 61000 — do not kill it
```

## MCP Tools

The MCP server exposes five tools that the agent must use to manage tickets. Connect to the MCP server at `http://localhost:61000/mcp`.

### `vibe_tracker_create_ticket`

Create a new ticket before starting any code changes.

**Required parameters:**
- `title` — Concise, descriptive title (prefix with action: `add`, `fix`, `refactor`, `remove`, `update`)
- `type` — One of: `issue`, `feat`, `bug`

**Optional parameters:**
- `description` — Detailed plan including all changed files and acceptance criteria

**Example:**
```json
{
  "name": "vibe_tracker_create_ticket",
  "arguments": {
    "title": "Add login page with OIDC auth",
    "type": "feat",
    "description": "Create a new login component with OIDC authentication flow.\n\nFiles modified:\n- src/app/pages/login/login.component.ts\n- src/app/services/auth.service.ts\n\nAcceptance criteria:\n- [ ] Login form renders correctly\n- [ ] OIDC redirect works\n- [ ] Redirected back to original page after auth"
  }
}
```

### `vibe_tracker_list_tickets`

List tickets with optional filters. Call this before creating a new ticket to avoid duplicates and reference related work.

**Optional parameters:**
- `status` — `open` or `closed`
- `type` — `issue`, `feat`, or `bug`
- `limit` — Max results (default: 50)
- `offset` — Pagination offset (default: 0)
- `sort_by` — `created`, `updated`, or `title` (default: `updated`)
- `sort_order` — `asc` or `desc` (default: `desc`)

### `vibe_tracker_get_ticket`

Get a single ticket by its ID (e.g., `issue-00001`).

**Required parameters:**
- `ticket_id` — The ticket identifier

### `vibe_tracker_update_ticket`

Update an existing ticket's metadata, status, or body.

**Required parameters:**
- `ticket_id` — The ticket identifier

**Optional parameters:**
- `title` — New title
- `type` — New type
- `status` — `open` or `closed`
- `body` — New markdown body content

### `vibe_tracker_delete_ticket`

Delete a ticket permanently.

**Required parameters:**
- `ticket_id` — The ticket identifier

## MCP Resources

The MCP server exposes resources for reading ticket data in different formats:

| URI Pattern | Format | Description |
|---|---|---|
| `vibe://tickets/` | JSON | Index of all tickets (summaries) |
| `vibe://tickets/{id}` | Markdown | Full rendered ticket content |
| `vibe://tickets/{id}/raw` | Markdown | Raw markdown source (frontmatter + body) |
| `vibe://tickets/{id}/metadata` | JSON | Ticket metadata (id, title, type, status, dates) |
| `vibe://config` | JSON | Current Vibe Tracker configuration |

**Example resource read:**
```
Read resource: vibe://tickets/issue-00001/raw
```

## Ticket Workflow Summary

```
1. vibe_tracker_list_tickets          → Check for existing tickets
2. vibe_tracker_create_ticket         → Create a new ticket with plan
3. git checkout -b issue-00001-add-x  → Create branch matching ticket ID
4. Write code                         → Implement the plan
5. git commit "issue-00001 add x"     → Prefix all commits with ticket ID
6. vibe_tracker_update_ticket         → Update ticket body with Changes section
7. vibe_tracker_update_ticket         → Set status to "closed" when done
```

## Ticket Types

| Type | When to use |
|------|-------------|
| `issue` | General problems, bugs, missing features, or any task that doesn't fit feat/bug |
| `feat` | New features, enhancements, or additions to existing functionality |
| `bug` | Fixing an existing bug or regression in the codebase |

## Configuration

The Vibe Tracker configuration is stored in `vibe-tracker.jsonc`:

```jsonc
{
  "VIBE_TRACKER_PORT": 61000, // If you change this port, update opencode.jsonc to match
  "VIBE_TRACKER_DOC_ROOT": ".vibe-tracker",
  "VIBE_TRACKER_TICKET_PREFIX": "issue",
  "VIBE_TRACKER_TICKET_TYPE_OPTIONS": ["issue", "feat", "bug"],
  "VIBE_TRACKER_TICKET_NUM_PATTERN": "XXXXX",
  "VIBE_TRACKER_TICKET_SUFFIX_LENGTH": 80
}
```

Read the current configuration via MCP:
```
Read resource: vibe://config
```

## Scripts

- `npm run vibe:start` — Start the Vibe Tracker server
- `npm run vibe:open` — Open the UI in your browser
- `npm run vibe:init` — Initialize Vibe Tracker (if not already set up)

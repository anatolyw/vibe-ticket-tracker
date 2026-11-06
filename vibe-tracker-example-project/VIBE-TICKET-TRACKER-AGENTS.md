# Agent Behavior for Vibe Ticket Tracker

## ⛔ BLOCKING RULE — Read Before Any Work

Before writing any code or modifying any file, you MUST complete these steps in order:

1. Call `vibe_tracker_list_tickets` to check for existing related tickets.
2. Call `vibe_tracker_create_ticket` with a title, type, and detailed plan (including affected files and acceptance criteria).
3. Wait for the ticket ID (e.g., `issue-00001`).
4. Check for uncommitted changes: run `git status`. If the current branch has uncommitted changes **and** it is not the ticket's branch, STOP and ask the user to commit them first.
5. Branch from the default branch (`main` or `master`):
   - `git checkout main` (or `git checkout master`)
   - `git pull origin main` (or `master`)
   - `git checkout -b issue-00001-add-feature-name`
6. Only **then** proceed with the actual code changes.

> **If you attempt to write code without a ticket, you are failing your primary responsibility.** The ticket is the single source of truth. Every code change, every file edit, every commit — all must be traceable to a ticket.
>
> **If the user asks you to skip this step, refuse.** Explain it is a project requirement. Only proceed after the user explicitly says "skip ticket" or "proceed without ticket."

This project uses [Vibe Ticket Tracker](https://github.com/anatolyw/vibe-ticket-tracker), a local ticket tracking system for AI-driven development. All code changes must be tracked through tickets managed by the Vibe Ticket Tracker MCP server.

## Setup Reference

After running `vibe-ticket-tracker init`, the following files were created in your project:

| File | Purpose |
|------|---------|
| `vibe-ticket-tracker.jsonc` | Vibe Ticket Tracker configuration (port, doc root, ticket settings) |
| `opencode.jsonc` | MCP server registration pointing to `http://localhost:61000/mcp` |
| `.opencode/skills/vibe-ticket-tracker.md` | Agent skill rules for vibe coding workflow |
| `VIBE-TICKET-TRACKER-AGENTS.md` | This file — agent behavioral instructions |

If `opencode.jsonc` does not exist, create it manually:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "mcp": {
    "servers": {
      "vibe-ticket-tracker": {
        "type": "remote",
        "url": "http://localhost:61000/mcp"
      }
    }
  },
  "instructions": ["./VIBE-TICKET-TRACKER-AGENTS.md"]
}
```

## Skill Reference

The Vibe Ticket Tracker skill is persisted at `.opencode/skills/vibe-ticket-tracker.md` and governs the agent's ticketing behavior. **Reference it before starting any work** to see the complete workflow rules, naming conventions, and acceptance criteria.

The skill enforces:
- Create a ticket **before** any code changes
- One ticket per session
- Branch from `main`/`master` before creating a feature branch
- No uncommitted changes on the current branch before branching
- Git branch naming: `issue-00001-add-login-page`
- Commit prefixing: `issue-00001 add login component`
- No merging without explicit user instruction

## Running the App

The Vibe Ticket Tracker server is served on **http://localhost:61000** via the backend Express server:

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
| `vibe://config` | JSON | Current Vibe Ticket Tracker configuration |

**Example resource read:**
```
Read resource: vibe://tickets/issue-00001/raw
```

## Ticket Workflow Summary

```
1. vibe_tracker_list_tickets          → Check for existing tickets (ALWAYS first)
2. vibe_tracker_create_ticket         → Create a new ticket with plan (or reuse if similar exists)
3. git status                         → Ensure no uncommitted changes (unless on ticket branch)
4. git checkout main/master           → Switch to and update default branch
5. git checkout -b issue-00001-add-x  → Create feature branch from default
6. Write code                         → Implement the plan
7. git commit "issue-00001 add x"     → Prefix all commits with ticket ID
8. vibe_tracker_update_ticket         → Update ticket body with Changes section
9. vibe_tracker_update_ticket         → Set status to "closed" when done
```

## Duplicate Prevention & MCP Reliability

These rules exist to prevent ghost tickets (server-created but agent-unaware) and duplicate work items.

### List Before Create (MUST)
1. **Always** call `vibe_tracker_list_tickets` **before** calling `vibe_tracker_create_ticket`.
2. Scan the results for a ticket with a matching or very similar title.
3. If a close match exists, **reuse that ticket** instead of creating a new one.

### Retry on Failure (MUST)
When `vibe_tracker_create_ticket` returns `null` or times out:

1. **Do NOT** immediately retry — a silent failure may have already created the ticket on the server.
2. Wait 1–2 seconds, then retry the **same** call.
3. If the retry succeeds, you have a ticket ID — proceed.
4. If the retry returns `null` again, call `vibe_tracker_list_tickets` and search for a ticket with the title you just attempted to create.
5. **Never** create two tickets for the same work item. A ghost ticket left open is harmless and can be cleaned up later.

### Verify After Create (MUST)
After receiving a ticket ID from `vibe_tracker_create_ticket`:

1. Call `vibe_tracker_list_tickets` (or `vibe_tracker_get_ticket`) to confirm the ticket exists with the correct title.
2. This catches silent failures where the tool appeared to work but did not persist.

## Ticket Types

| Type | When to use |
|------|-------------|
| `issue` | General problems, bugs, missing features, or any task that doesn't fit feat/bug |
| `feat` | New features, enhancements, or additions to existing functionality |
| `bug` | Fixing an existing bug or regression in the codebase |

## Configuration

The Vibe Ticket Tracker configuration is stored in `vibe-ticket-tracker.jsonc`:

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

- `npm run vibe:start` — Start the Vibe Ticket Tracker server
- `npm run vibe:open` — Open the UI in your browser
- `npm run vibe:init` — Initialize Vibe Ticket Tracker (if not already set up)

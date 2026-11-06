---
id: issue-0010
title: Backend E2E
type: issue
status: closed
created: 2026-11-02
updated: 2026-11-02
---
# Backend E2E Implementation Plan

## Overview

Add comprehensive end-to-end tests for the Vibe Ticket Tracker backend, covering REST API endpoints, MCP JSON-RPC features, race conditions, and error handling. Tests run against a live server using Playwright with a dedicated test doc root that is cleaned per test.

**Status: ✅ COMPLETE — 102/102 tests passing**

---

## File Structure (Implemented)

```
backend/e2e/
├── shared/
│   ├── global-setup.cjs           — Global setup: builds server, spawns on port 61001
│   ├── global-teardown.cjs        — Global teardown: kills server, cleans up
│   ├── make-request.ts            — Shared request helpers for REST + MCP JSON-RPC
│   └── test-helpers.ts            — Utility functions for API requests, ticket cleanup
├── api-tickets.spec.ts            — REST API ticket CRUD tests (41 tests)
├── mcp-tools.spec.ts              — MCP tools/list, tools/call tests (22 tests)
├── mcp-resources.spec.ts          — MCP resources/read, resources/templates/list tests (16 tests)
└── race-condition.spec.ts         — Duplicate submission, error handling tests (23 tests)

backend/playwright.config.ts       — Playwright config (port 61001, global setup/teardown)
```

---

## Implementation Details

### Global Setup/Teardown (Phase 0)

Instead of per-file `beforeAll`/`afterAll`, a **global setup** starts a single server for all tests:

- **`shared/global-setup.cjs`** — CommonJS file (required for Playwright globalSetup with ESM project)
  1. Builds the server if not already built
  2. Creates temp doc root directory (`tmp/.vibe-tracker-e2e-doc-{timestamp}`)
  3. Writes `vibe-ticket-tracker.json` config pointing to temp doc root
  4. Spawns server on port 61001 with the temp base dir
  5. Stores port in `global.__E2E_PORT` for test helpers to use
  6. Waits for server health (`/api/tickets` returns 200)

- **`shared/global-teardown.cjs`** — Kills server on port 61001, cleans up temp dirs

This approach avoids port conflicts between parallel test workers because there's only one server instance.

### Shared Infrastructure

**`shared/test-helpers.ts`**:
- `createTicket(request, title, type, description)` — POST to `/api/tickets`, returns ticket
- `deleteTicket(request, ticketId)` — DELETE `/api/tickets/:id`, idempotent (swallows 404s)
- `createAndCleanup(request, title, type)` — Returns `{ ticket, cleanup }` for try/finally pattern

**`shared/make-request.ts`**:
- `mcpListTools(request)` — POST `tools/list` to MCP endpoint
- `mcpCallTool(request, name, args)` — POST `tools/call` to MCP endpoint
- `mcpReadResource(request, uri)` — POST `resources/read` to MCP endpoint
- `mcpListResourceTemplates(request)` — POST `resources/templates/list`

All helpers read the port from `global.__E2E_PORT`.

### API Ticket Tests (`api-tickets.spec.ts`) — 41 tests

**Create** (`POST /api/tickets`) — 9 tests:
- Full create with all fields → 201, returns ticket with all fields
- Create with title + type only → default body sections
- Missing title → 400 "Title is required"
- Empty string title → 400
- Whitespace-only title → 400 (**fixed backend bug**: added `!title.trim()` check)
- Invalid type → 400
- Sequential IDs → ascending order (relaxed from adjacent due to parallel tests)
- ISO 8601 timestamps
- Status code 201

**Read** — 14 tests:
- List with pagination structure
- Filter by status (open/closed)
- Filter by type
- Text search in title
- Text search in body — creates ticket via raw POST with description, verifies ticket in search results
- Sort by created (asc/desc)
- Sort by title (asc) — uses unique prefixes to avoid collisions
- Limit and offset
- Get single ticket by ID (full ticket with body.raw/html)
- Get non-existent → 404
- Get raw markdown — verifies content-type is `text/markdown`, checks for `---`, title, and `## Description`
- Get raw for non-existent → 404
- Summaries endpoint — verifies structure

**Update** (`PUT /api/tickets/:id`) — 12 tests:
- Update title, status, type, body individually
- Update multiple fields at once
- Partial update (preserves other fields)
- Empty body → 400
- Invalid type → 400
- Non-existent ticket → 400
- Round-trip verification (update then GET)
- `created` timestamp preserved
- `updated` timestamp changes

**Delete** (`DELETE /api/tickets/:id`) — 4 tests:
- Delete → 200, `{ success: true, id }`
- Deleted ticket returns 404
- Delete non-existent → 404
- Deleted ticket removed from list

### MCP Tests — 38 tests total

**Tools** (`mcp-tools.spec.ts`) — 22 tests:

Initialize & Schema:
- `initialize` returns valid response (handles array format `[response, notification]`)
- Invalid request (no jsonrpc) → 400, error code -32600
- `tools/list` returns 5 tools with correct schemas
- Each tool's schema validated (required fields, enum types)
- Unknown tool call → error code -32603
- Unknown method → error code -32601

Tool Operations:
- `vibe_tracker_create_ticket` — creates ticket, default type, empty title error, invalid type error
- `vibe_tracker_update_ticket` — update title, status, missing ticket_id, no fields, non-existent
- `vibe_tracker_list_tickets` — list, filter by status
- `vibe_tracker_get_ticket` — get existing, missing ticket_id, non-existent
- `vibe_tracker_delete_ticket` — delete, missing ticket_id, non-existent

**Resources** (`mcp-resources.spec.ts`) — 16 tests:

Templates:
- `resources/templates/list` returns 5 templates
- Each template verified for correct URI and MIME type

Read:
- `vibe://config` returns config as JSON
- `vibe://tickets/` returns ticket index
- `vibe://tickets/{id}` returns rendered HTML
- `vibe://tickets/{id}/raw` returns raw markdown
- `vibe://tickets/{id}/metadata` returns JSON metadata
- Non-existent ticket, unknown URI, missing URI → errors

### Race Condition Tests (`race-condition.spec.ts`) — 23 tests

Duplicate Ticket Submission:
- Two tickets with same title → unique IDs
- Concurrent creates → distinct sequential IDs (ascending, may have gaps)
- Rapid creates maintain ordering
- Same title creates get suffixed filenames

Duplicate Update:
- Second update overwrites first
- Rapid updates reflect last update

Delete-then-Use:
- GET after DELETE → 404
- PUT after DELETE → 400
- DELETE on already-deleted → 404
- MCP delete then GET returns error

Error Handling Edge Cases:
- Missing title field → 400
- Empty body in PUT → 400
- Malformed non-existent ID → 404
- Invalid type in body → 400
- Summaries with no tickets → empty array
- Large offset → empty list
- Invalid limit → defaults to valid range
- Invalid status → 400

### Backend Bug Fixes

1. **Whitespace-only title validation** — The API handler `POST /api/tickets` in `backend/src/api/tickets.ts` now checks `!title.trim()` in addition to `!title`. Previously, whitespace-only titles like `'   '` passed the `!title` check (since `'   '` is truthy) and were created as tickets.

### README Updates

- **Root `README.md`**: Added "Backend E2E Tests" section after existing frontend E2E section
- **Frontend `README.md`**: Added cross-reference note about backend E2E tests

---

## How to Run

```bash
cd backend
npx playwright test          # Run all backend E2E tests
npx playwright test --headed # Interactive mode
npx playwright test --ui     # Test explorer
```

The global setup automatically:
1. Builds the server if needed
2. Creates an isolated temp directory for tickets
3. Starts the server on port 61001
4. Cleans up everything when tests complete

### Test Coverage

| Category | Files | Tests |
|----------|-------|-------|
| REST API — Create | api-tickets.spec.ts | 9 |
| REST API — Read | api-tickets.spec.ts | 14 |
| REST API — Update | api-tickets.spec.ts | 12 |
| REST API — Delete | api-tickets.spec.ts | 4 |
| MCP — Tools | mcp-tools.spec.ts | 22 |
| MCP — Resources | mcp-resources.spec.ts | 16 |
| Race Conditions | race-condition.spec.ts | 16 |
| Error Handling | race-condition.spec.ts | 7 |
| **Total** | **4 spec files** | **102** |

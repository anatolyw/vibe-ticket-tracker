# Vibe Tracker — Backend

Server-side API, MCP endpoint, and ticket storage engine.

## Structure

```
backend/
├── bin/          — CLI wrapper (delegates to compiled CLI in dist-server/)
├── e2e/          — End-to-end API and MCP tests
├── src/
│   ├── api/      — Express REST API routes
│   ├── mcp/      — MCP (Model Context Protocol) endpoint
│   ├── storage/  — Ticket CRUD, schema validation, YAML/JSON parsing
│   ├── cli.ts    — CLI entry point (init/start commands)
│   └── index.ts  — Express app factory & server launcher
├── tsconfig.server.json
├── .gitignore
└── package.json
```

## Commands

All scripts are run from the **repo root**.

```bash
# Build the TypeScript server
npm run build:server

# Build server and UI together
npm run build

# Build both, then copy server to dist-server/ and start via CLI
npm run build 
mkdir -p dist-server 
cp -r backend/dist/* dist-server/ 
node dist-server/cli.js start

# Start the server (from CLI entry)
node dist-server/cli.js start            # default port 61000
node dist-server/cli.js start --port 61001
node dist-server/cli.js start --dev      # dev mode, no child process

# Run E2E tests (requires built server running)
cd backend && npx playwright test
```

## API

| Method | Endpoint             | Description                      |
|--------|----------------------|----------------------------------|
| GET    | /api/tickets         | List all tickets                 |
| GET    | /api/tickets/types   | List all configured ticket types |
| GET    | /api/tickets/:id     | Get single ticket                |
| POST   | /api/tickets         | Create a ticket                  |
| PUT    | /api/tickets/:id     | Update a ticket                  |
| DELETE | /api/tickets/:id     | Delete a ticket                  |
| POST   | /mcp                 | MCP JSON-RPC endpoint            |

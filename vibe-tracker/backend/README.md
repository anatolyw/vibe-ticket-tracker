# Vibe Tracker — Backend

Server-side API, MCP endpoint, and ticket storage engine.

## Structure

```
backend/
├── bin/          — CLI entry point (vibe-tracker init/start)
├── src/
│   ├── api/      — Express REST API routes
│   ├── mcp/      — MCP (Model Context Protocol) endpoint
│   ├── storage/  — Ticket CRUD, schema validation, YAML/JSON parsing
│   └── index.ts  — Express app factory & server launcher
├── tsconfig.server.json
├── README.md
└── .gitignore
```

## Commands

From repo root:
```bash
npm run build:server   # Compile TypeScript → backend/dist/
npm start              # Start the server from repo root
```

From `backend/` directory:
```bash
npm run build          # Compile TypeScript → dist/
node ../dist/index.js  # Start the server directly
```

## API

| Method | Endpoint        | Description           |
|--------|-----------------|-----------------------|
| GET    | /api/tickets    | List all tickets      |
| GET    | /api/tickets/:id| Get single ticket     |
| POST   | /api/tickets    | Create a ticket       |
| PUT    | /api/tickets/:id| Update a ticket       |
| DELETE | /api/tickets/:id| Delete a ticket       |
| POST   | /mcp            | MCP JSON-RPC endpoint |

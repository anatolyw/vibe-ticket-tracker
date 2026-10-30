# Vibe Tracker Workspace

A local ticket tracking system for vibe coders, with a CLI, REST API, MCP integration, and web UI — plus a demo project showing how to use it.

## Projects

| Project | Description |
|---|---|
| [**vibe-tracker**](vibe-tracker/README.md) | The main package — CLI, Express API, Angular UI, and MCP server |
| [**vibe-tracker-example-project**](vibe-tracker-example-project/README.md) | Demo project showing how to integrate Vibe Tracker into a real project |

## What It Does

Vibe Tracker lets AI-driven developers track all performed changes as living documentation. Each code change is tied to a ticket that describes the plan, files affected, and acceptance criteria.

Key capabilities:
- **CLI** — `vibe-tracker init` and `vibe-tracker start`
- **Web UI** — Angular SPA with dashboard, ticket list, and markdown editor
- **REST API** — Full CRUD for tickets
- **MCP integration** — AI agents create, read, update, list, and delete tickets programmatically
- **Dark/Light theme** with persisted preference

Designed for [OpenCode v2+](https://github.com/anomalyco/opencode) — the open source AI coding agent. `vibe-tracker init` prepares default OpenCode configuration out of the box (MCP server registration, skill rules, agent guidelines). It can be easily adapted for any other AI coding agent.

## Quick Start

```bash
# Initialize in a project
vibe-tracker init

# Start the server (default port 61000)
vibe-tracker start
```

## License

MIT

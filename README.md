# Vibe Ticket Tracker Workspace

A local ticket tracking system for vibe coders, featuring a CLI, REST API, MCP integration, and web UI — plus a demo project that shows how to use it.

This project was developed inside [vibe-sandbox](https://github.com/anatolyw/vibe-sandbox) — an easy container for sandboxing LLM agents.

## Projects

| Project | Description |
|---|---|
| [**vibe-tracker**](vibe-tracker/README.md) | The main npm package — CLI, Express API, Angular UI, and MCP server |
| [**vibe-tracker-example-project**](vibe-tracker-example-project/README.md) | Demo project showing how to integrate Vibe Ticket Tracker into a real project. Example of prompt, generated code and documentation artifacts |

## What It Does

Vibe Ticket Tracker lets AI-driven developers track all performed changes as living documentation. Each code change is tied to a ticket that describes the plan, files affected, and acceptance criteria.

Key capabilities:
- **CLI** — `vibe-ticket-tracker init` and `vibe-ticket-tracker start`
- **Web UI** — Angular SPA with dashboard, ticket list, and markdown editor
- **REST API** — Full CRUD for tickets
- **MCP integration** — AI agents create, read, update, list, and delete tickets programmatically
- **Dark/Light theme** with persisted preference

Designed for [OpenCode v2+](https://github.com/anomalyco/opencode) — the open source AI coding agent. `vibe-ticket-tracker init` prepares default OpenCode configuration out of the box (MCP server registration, skill rules, agent guidelines). It can be easily adapted for any other AI coding agent.

## Quick Start

```bash
# Add vibe-ticket-tracker to your project
npm install vibe-ticket-tracker

# Initialize in a project
vibe-ticket-tracker init

# Start the server (default port 61000)
vibe-ticket-tracker start
```

# Example project

## Screenshots

See example project [here](./vibe-tracker-example-project/)

Dashboard Example:
![Dashboard](./docs/example-dashboard.png)

Ticket Example:
![Ticket](./docs/example-ticket.png)

## License

[MIT](./vibe-tracker/LICENSE)

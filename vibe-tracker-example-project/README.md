# Vibe Tracker Example Project

A demo project showing how to use the `vibe-tracker` package for local ticket tracking.

## Prerequisites

Ensure the `vibe-tracker` CLI is available in your PATH:

```bash
# The CLI is installed at:
export PATH="$HOME/.local/bin:$PATH"
vibe-tracker   # Should show usage info
```

> **Note**: If you get `command not found`, the CLI binary lives at `/workspace/vibe-tracker/bin/vibe-tracker.cjs`. You can either:
> - Run it directly: `node /workspace/vibe-tracker/bin/vibe-tracker.cjs init`
> - Or set up a symlink: `ln -s /workspace/vibe-tracker/bin/vibe-tracker.cjs ~/.local/bin/vibe-tracker`

## Quick Start

```bash
# Make sure vibe-tracker is in your PATH
export PATH="$HOME/.local/bin:$PATH"

# Initialize (generates config, .vibe-tracker/ directory, package.json scripts)
vibe-tracker init

# Start the server
vibe-tracker start

# Open in browser
npm run vibe:open
```

## Setup for Development

To link this project to a local `vibe-tracker/` package:

```bash
# From vibe-tracker-example-project/
npm install file:../vibe-tracker --save

# Or use npm link (requires global install first)
npm link ../vibe-tracker
```

## Project Structure

```
vibe-tracker-example-project/
├── .vibe-tracker/          # Ticket files (auto-generated)
│   └── issue-NNNNN-*.md
├── opencode.jsonc          # MCP config for OpenCode
├── vibe-tracker.json       # App configuration
├── VIBE-TRACKER-SKILL.md   # Agent rules
├── package.json            # with vibe scripts
└── README.md
```

## Usage with AI Agents

This project is configured to work with OpenCode's MCP integration:

1. The `opencode.jsonc` file configures the MCP server endpoint
2. `VIBE-TRACKER-SKILL.md` provides rules for how agents should use the tracker
3. Agents use MCP tools to create/list/update/delete tickets programmatically

## Package.json Scripts

| Script | Command | Description |
|--------|---------|-------------|
| `vibe` | `vibe-tracker start` | Start the server |
| `vibe:start` | `vibe-tracker start` | Start the server |
| `vibe:init` | `vibe-tracker init` | Initialize a new project |
| `vibe:open` | `open http://localhost:61000` | Open in browser |

## Ticket Types

- **issue** — General task, request, or problem
- **feat** — New feature or enhancement
- **bug** — Fixing an existing bug

Customize in `vibe-tracker.json` under `VIBE_TRACKER_TICKET_TYPE_OPTIONS`.

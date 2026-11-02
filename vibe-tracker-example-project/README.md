# Vibe Tracker Example Project

This demo project content was set up with `vibe-tracker init` package for local ticket tracking.

After setup, keep server running during vibe coding for UI and MCP endpoints.

## Setup & Display Next Steps

```bash
$ mkdir vibe-tracker-example-project
$ cd vibe-tracker-example-project
$ npm init -y                     
$ npm install ../vibe-tracker/vibe-tracker-1.0.0.tgz
$ npx vibe-tracker init # Run setup dialog                    

═══ Vibe Tracker Initialize ═══

❯ What port should the Vibe Tracker server use? (61000-62000, default: 61000) 
✓ Config written → /Users/mac/workspace-rl/vibe-tracker/vibe-tracker-example-project1/vibe-tracker.jsonc
✓ Ticket directory → /Users/mac/workspace-rl/vibe-tracker/vibe-tracker-example-project1/.vibe-tracker
❯ Where should the Vibe Tracker skill file be placed? (default: .opencode/skills/vibe-tracker.md) 
❯ Generate opencode.jsonc MCP configuration? (y/N) y
✓ MCP config written → /Users/mac/workspace-rl/vibe-tracker/vibe-tracker-example-project1/opencode.jsonc
✓ Skill written → /Users/mac/workspace-rl/vibe-tracker/vibe-tracker-example-project1/.opencode/skills/vibe-tracker.md
❯ Create VIBE-TRACKER-AGENTS.md with Vibe Tracker workflow? (y/N) y
✓ VIBE-TRACKER-AGENTS.md written → /Users/mac/workspace-rl/vibe-tracker/vibe-tracker-example-project1/VIBE-TRACKER-AGENTS.md

═══ Setup Complete ═══

Next steps:
  npx vibe-tracker start    — Start the server
  Open in browser http://localhost:61000
  Agent file → VIBE-TRACKER-AGENTS.md
  Skill file → .opencode/skills/vibe-tracker.md
  MCP config for OpenCode → opencode.jsonc
```

## Ticket Types

- **issue** — General task, request, or problem
- **feat** — New feature or enhancement
- **bug** — Fixing an existing bug

Customize in `vibe-tracker.jsonc` under `VIBE_TRACKER_TICKET_TYPE_OPTIONS`.

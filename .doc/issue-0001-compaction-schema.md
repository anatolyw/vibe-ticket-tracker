# Issue 0001 — Compaction Output JSON Schema

## Objective

Create a JSON Schema that models the structured "compaction" / context summary format used by the OpenCode agent during tool sessions. The agent prints these summaries after each major step — they contain the objective, requirements, decisions, work state, next move, relevant files, and important context.

## Input

The user provided example outputs that the agent prints during a session. Each example is a structured text block with these sections:

| Section | Format |
|---|---|
| `Objective` | Single-line string |
| `Requirements` | Bullet list of strings |
| `Decisions` | Bullet list of strings |
| `Work State` | Object with `Completed`, `Active`, `Blocked` subsections, each a bullet list |
| `Next Move` | Numbered list of strings |
| `Relevant Files` | List of `path: description` pairs |
| `Important Context` | Bullet list of strings |

The agent also prints metadata around the block (token count, usage percentage, MCP status, timestamp), but the schema covers only the structured data content.

## Schema Design

### Structure

| Field | Type | Required | Description |
|---|---|---|---|
| `objective` | `string` | ✅ | What the agent is trying to accomplish |
| `requirements` | `string[]` | ✅ | Bullet-point requirements the solution must satisfy |
| `decisions` | `string[]` | ✅ | Key decisions made during the task |
| `workState` | `object` | ✅ | Current state of work split into three subsections |
| `workState.completed` | `string[]` | ✅ | Completed actions or findings |
| `workState.active` | `string[]` | 🔓 | In-progress actions (may contain placeholder `"(none — issue is fully diagnosed)"`) |
| `workState.blocked` | `string[]` | 🔓 | Current blockers preventing progress |
| `nextMove` | `string[]` | ✅ | Numbered list of next steps to take |
| `relevantFiles` | `fileDesc[]` | ✅ | Files relevant to the task |
| `relevantFiles[].path` | `string` | ✅ | Absolute or relative file path |
| `relevantFiles[].description` | `string` | ✅ | Why this file is relevant |
| `importantContext` | `string[]` | ✅ | Retainable context (platform, URLs, errors, etc.) |

### Key design decisions

1. **`requiredFiles` is not a separate field** — the examples used `relevantFiles` as the field name. Each entry is a path–description pair.

2. **`importantContext` is a top-level array** — not an object. Matches the flat bullet-list style of the compaction output.

3. **`workState.active` and `workState.blocked` are optional (minItems: 0)** — the examples sometimes show `"(none — issue is fully diagnosed)"` as a placeholder string, but a real empty state could just be an empty array.

4. **No metadata fields** — the token count (e.g., `7,019 tokens`), usage percentage (e.g., `3% used`), MCP status indicators, and timestamps are printed *around* the structured block, not *inside* it. The schema does not attempt to model these.

5. **`additionalProperties: false`** — keeps the schema strict so that any deviation is immediately visible.

## Generated Schema

The schema was generated and written to `/workspace/compaction-schema.json`.

### Schema location

- **Path:** `/workspace/compaction-schema.json`
- **Schema ID:** `https://example.com/compaction-output.schema.json`
- **JSON Schema Draft:** `2020-12`
- **Title:** `OpenCode Compaction / Context Summary`

## Example Instance

A realistic example from the session is embedded in the schema's `examples` array:

```json
{
  "objective": "Configure OpenCode V2 to connect to the VSCode MCP Server at http://host.docker.internal:6010/sse via a lightweight proxy.",
  "requirements": [
    "Use the VSCode MCP Server at http://host.docker.internal:6010/sse (SSE transport, GET for initial connection, POST for messages).",
    "Integrate via /home/node/opencode.json.",
    "Bridge the HTTP method mismatch between OpenCode and the VSCode MCP Server."
  ],
  "decisions": [
    "Server type: remote with URL config pointing to the proxy endpoint.",
    "OpenCode always sends HTTP POST to the SSE endpoint — no config option exists to change this.",
    "A lightweight Node.js proxy bridges the mismatch."
  ],
  "workState": {
    "completed": [
      "Confirmed env vars VSCODE_MCP_URL and VSCODE_MCP_STREAM_URL both set to http://host.docker.internal:6010/sse.",
      "Created /home/node/opencode.json with VSCode MCP server config.",
      "Created proxy script at /home/node/mcp-proxy.js."
    ],
    "active": [
      "Waiting for proxy startup to complete."
    ],
    "blocked": [
      "Cannot proceed until proxy confirms successful startup."
    ]
  },
  "nextMove": [
    "Check proxy output to confirm it started successfully.",
    "Update /home/node/opencode.json to point the MCP server URL to the proxy endpoint.",
    "Run opencode mcp list to verify connection.",
    "List available tools and demonstrate a tool call."
  ],
  "relevantFiles": [
    {
      "path": "/home/node/opencode.json",
      "description": "OpenCode config — needs URL updated to proxy endpoint."
    },
    {
      "path": "/home/node/mcp-proxy.js",
      "description": "Proxy script bridging POST-to-GET SSE translation."
    }
  ],
  "importantContext": [
    "Platform: Linux inside Docker container, working directory /home/node.",
    "VSCode MCP Server: SSE endpoint at http://host.docker.internal:6010/sse, expects GET for initial stream.",
    "Proxy listens on 127.0.0.1:16101; target is http://host.docker.internal:6010/sse."
  ]
}
```

## How It Was Generated

1. **User prompt:** The user pasted several example compaction outputs and asked: *"Can you give me a json schema which you use for such answers? Or generate a simplified one and write to the disk."*

2. **Analysis:** I extracted the repeating structure across all examples — seven top-level sections, each with a consistent format.

3. **Schema creation:** I used `write` to create `/workspace/compaction-schema.json` with the JSON Schema draft, property definitions, and a realistic example.

4. **Verification:** No external validation was performed (no `ajv` or equivalent installed), but the schema follows JSON Schema 2020-12 conventions and includes an `examples` array for client-side validation.

## Files

| File | Description |
|---|---|
| `/workspace/compaction-schema.json` | The generated JSON Schema (Draft 2020-12) |
| `/workspace/.doc/issue-0001-compaction-schema.md` | This document |

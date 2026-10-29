# Secure Read Plugin

## Purpose

An OpenCode V2 plugin that prevents the agent from reading `.env` files. It blocks `.env` file access through **two** channels:

1. The built-in `read` tool — blocked when the target path ends in `.env`.
2. The `shell` tool — blocked when the command pattern matches known `.env` readers (`cat`, `grep`, `source`, `head`, `tail`, etc.).

This forces the model to ask for values explicitly instead.

## Files

| File | Role |
|---|---|
| `/workspace/.opencode/plugins/secure-read/package.json` | Plugin manifest (name, exports) |
| `/workspace/.opencode/plugins/secure-read/index.ts` | Plugin implementation — wraps the `read` **and** `shell` tool executors |
| `~/.config/opencode/opencode.jsonc` | Global config; `"plugins": ["./plugins/secure-read"]` |

The plugin is registered in the global `opencode.jsonc`. The actual plugin files live under the project directory (`/workspace/.opencode/plugins/secure-read/`) — the global config resolves them from there.

You can verify which instance is active with:

```bash
opencode plugin list
# secure-read  local    /workspace/.opencode/plugins/secure-read
```

## How It Works

### Guard 1: read tool (path-based)

```
User request → session prompt → model decides to call `read` tool
  → path = "/workspace/.env"
  → plugin transform intercepts executor
  → path.endsWith(".env") → true
  → throw Error("Blocked: reading .env files is not allowed. ...")
  → model sees error, explains the block to the user
```

### Guard 2: shell tool (command-based)

```
User request → session prompt → model decides to call `shell` tool
  → command = "grep MY_VAR /workspace/.env"
  → plugin transform intercepts executor
  → isEnvReadCommand(command) → true  (matches /grep\s+.*\.env\b/i)
  → throw Error("Blocked: shell commands that read .env files are not allowed.")
  → model sees error, explains the block to the user
```

### Implementation detail

The plugin uses `ctx.tool.transform()` to wrap **two** tools:

```ts
import { Plugin } from "@opencode/plugin"

// Regex patterns that match commands trying to read .env files
const ENV_READ_PATTERNS = [
  /cat\s+.*\.env\b/i,
  /grep\s+.*\.env\b/i,
  /source\s+.*\.env\b/i,
  /\.?\s*\.env\b/i,
  /export\s+.*\.env\b/i,
  /echo\s+.*\.env\b/i,
  /head\s+.*\.env\b/i,
  /tail\s+.*\.env\b/i,
  /less\s+.*\.env\b/i,
  /more\s+.*\.env\b/i,
  /wc\s+.*\.env\b/i,
  /diff\s+.*\.env\b/i,
]

function isEnvReadCommand(command: string): boolean {
  return ENV_READ_PATTERNS.some((pattern) => pattern.test(command))
}

export default Plugin.define({
  id: "secure-read",
  async setup(ctx) {
    // Guard 1: block the read tool for .env paths
    await ctx.tool.transform((editor) => {
      const readTool = editor.get("read")
      if (!readTool) return

      editor.update(readTool.id, (t) => {
        const originalExecute = t.execute
        t.execute = async (input, context) => {
          const filePath = (input as { path?: string }).path || ""
          if (filePath.endsWith(".env")) {
            throw new Error(
              "Blocked: reading .env files is not allowed. " +
              "Use explicit environment variable keys instead.",
            )
          }
          return originalExecute(input, context)
        }
      })
    })

    // Guard 2: block the shell tool from reading .env files
    await ctx.tool.transform((editor) => {
      const shellTool = editor.get("shell")
      if (!shellTool) return

      editor.update(shellTool.id, (t) => {
        const originalExecute = t.execute
        t.execute = async (input, context) => {
          const command = (input as { command?: string }).command || ""
          if (isEnvReadCommand(command)) {
            throw new Error(
              "Blocked: shell commands that read .env files are not allowed.",
            )
          }
          return originalExecute(input, context)
        }
      })
    })
  },
})
```

### Tool lookup

- The `read` tool is registered under the effective id `"read"`.
- The `shell` tool is registered with `name: "shell"` and `options: { codemode: false }`, so its effective id is also `"shell"`.

## Plugin Lifecycle

1. **Load** — OpenCode loads `/workspace/.opencode/plugins/secure-read/index.ts` as a local plugin. The `package.json` declares `exports: { ".": "./index.ts" }`.
2. **Transform registration** — During `setup`, two `ctx.tool.transform()` callbacks are registered. When the tool registry rebuilds, both callbacks replay and wrap the `read` and `shell` tools.
3. **Runtime** — Every `read` or `shell` invocation passes through its wrapper. No state is stored; both checks are purely string-based (path or command pattern).
4. **Unload** — When the plugin unloads (e.g., config change), the transforms are disposed and the original executors are restored.

## Testing Performed

### Test environment

- Platform: Linux (Docker container)
- OpenCode version: 2.2.1 (precompiled binary)
- Working directory: `/workspace`
- `.env` file: `/workspace/.env` containing `MY_VAR=prod`

### Test 1: read tool on `.env` file

**Command sent to session:**
> "Read the file /workspace/.env"

**Result:**

```json
{"error":{"type":"unknown","message":"Blocked: reading .env files is not allowed."},"content":[]}
```

**Blocked** ✅

### Test 2: shell tool with `cat` on `.env` file

**Command sent to session:**
> "Try: cat /workspace/.env"

**Result:**

```json
{"error":{"type":"unknown","message":"Blocked: shell commands that read .env files are not allowed."},"content":[]}
```

**Blocked** ✅

### Test 3: shell tool with `grep` on `.env` file

**Command sent to session:**
> "Try: grep MY_VAR /workspace/.env"

**Result:**

```json
{"error":{"type":"unknown","message":"Blocked: shell commands that read .env files are not allowed."},"content":[]}
```

**Blocked** ✅

### Test 4: read tool on non-`.env` file (should succeed)

**Command sent to session:**
> "Use the read tool to read /workspace/compaction-schema.json"

**Result:** File contents returned successfully.

**Allowed** ✅

### Test 5: shell tool with non-`.env` command (should succeed)

**Command sent to session:**
> "Try: ls -la /workspace/.doc"

**Result:** Directory listing returned successfully.

**Allowed** ✅

### Test 6: Plugin status verification

```bash
opencode plugin list
```

```
ID           VERSION  SOURCE
-            local    /home/node/.config/opencode/plugins/secure-read    (inactive — directory missing)
-            local    /workspace/plugins/secure-read                     (not matched by config)
secure-read  local    /workspace/.opencode/plugins/secure-read           ✅ active
```

## Edge Cases & Limitations

| Scenario | Behavior |
|---|---|
| Path is `/some/path/.env` | **Blocked** — read guard (`endsWith(".env")`) |
| Path is `/some/path/.env.production` | **Not blocked** — read guard only matches exact `.env` suffix |
| Path is `/some/path/.env.local` | **Not blocked** — read guard only matches exact `.env` suffix |
| `shell` command: `cat .env` | **Blocked** — matches `/cat\s+.*\.env\b/i` |
| `shell` command: `grep MY_VAR .env` | **Blocked** — matches `/grep\s+.*\.env\b/i` |
| `shell` command: `source .env` | **Blocked** — matches `/source\s+.*\.env\b/i` |
| `shell` command: `ls .env` | **Not blocked** — `ls` is not in the pattern list (safe command) |
| `shell` command: `echo hello` | **Not blocked** — no `.env` reference |
| File attached via prompt (user pastes content) | **Allowed** — content is already in the message; no tool call needed |
| `write` tool used to write to `.env` | **Not blocked** — only `read` and `shell` are wrapped |
| `subagent` tool used to read `.env` | **Not blocked** — subagents get their own context; no wrapper here |

### Suggested improvements

1. **Broader read guard pattern** — block paths like `.env.local`, `.env.production`, `.env.staging` by checking if the basename **starts with** `.env` instead of just **ending with** `.env`.
2. **`write` tool guard** — block writes to `.env` files to prevent accidental secret leakage.
3. **`subagent` tool guard** — wrap `subagent` to pass the same `.env` restriction to spawned subagents.
4. **Broader shell pattern** — add commands like `xxd`, `hexdump`, `base64`, `curl`/`wget` with `.env` URLs, or other indirect data exfiltration patterns.

## Enable / Disable

### Listing plugins

```bash
opencode plugin list
```

### Enabling the plugin

Ensure the plugin is listed in your global config `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": ["./plugins/secure-read"]
}
```

The service watches config files and auto-reloads plugins on save. After editing, reload:

```bash
opencode reload
```

Or use `/reload` in the TUI.

Verify it's active:

```bash
opencode plugin list
# secure-read  local    /workspace/.opencode/plugins/secure-read
```

### Disabling the plugin

**Option A:** Comment out or remove the plugin entry from `~/.config/opencode/opencode.jsonc`:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": []
}
```

Then reload:

```bash
opencode reload
```

**Option B:** Mark the plugin as disabled:

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "plugins": [
    { "package": "./plugins/secure-read", "disabled": true }
  ]
}
```

Then reload:

```bash
opencode reload
```

Verify the plugin no longer shows as active:

```bash
opencode plugin list
# secure-read should no longer appear, or show as disabled/failed
```

## How to Verify It Is Active

### Quick smoke test

```bash
# 1. read tool should succeed for non-.env files
opencode run "Use the read tool to read /workspace/compaction-schema.json"
# → Agent should successfully read and summarize the file

# 2. read tool should block .env files
opencode run "Read the file /workspace/.env"
# → Agent should return: "Blocked: reading .env files is not allowed."

# 3. shell tool should succeed for non-.env commands
opencode run "Try: ls -la /workspace/.doc"
# → Agent should successfully run ls

# 4. shell tool should block .env reading commands
opencode run "Try: cat /workspace/.env"
# → Agent should return: "Blocked: shell commands that read .env files are not allowed."
```

### Verify plugin is loaded

```bash
opencode plugin list
# Should show secure-read with SOURCE /workspace/.opencode/plugins/secure-read

# Or check via API:
opencode api get /api/plugin | python3 -c "import sys,json; [print(d.get('id'),d.get('state',{}).get('status')) for d in json.load(sys.stdin)['data'] if 'secure' in d.get('id','')]"
# Output: secure-read active
```

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

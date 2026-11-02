const { rmSync } = require('fs');

async function teardown() {
  // Kill server process
  try {
    const { spawn } = require('child_process');
    // Try to find and kill the server by port
    const { execSync } = require('child_process');
    try {
      execSync(`lsof -ti:61001 | xargs kill -9 2>/dev/null || true`, { stdio: 'ignore' });
    } catch { /* ignore */ }
  } catch { /* ignore */ }

  // Clean up temp directories
  const docRoot = global.__E2E_DOC_ROOT;
  if (docRoot) {
    try { rmSync(docRoot, { recursive: true, force: true }); } catch { /* ignore */ }
  }
  const baseDir = global.__E2E_BASE_DIR;
  if (baseDir) {
    try { rmSync(baseDir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

module.exports = teardown;

# Agent Behavior for Vibe Tracker

## Development Workflow

### Running the App

The app is served on **port 61000** via the backend server, which serves the built Angular frontend:
- Backend serves static files from: `/workspace/vibe-tracker/frontend/dist/ui/browser`
- Build command: `cd /workspace/vibe-tracker/frontend && npm run build`
- Access the app at: `http://localhost:61000`

### After Code Changes

1. **Rebuild the Angular frontend** after any source code changes
2. **Verify the backend is still running** on port 61000 (`curl -s http://localhost:61000 | head -5`)
3. **Keep the app running** for manual review — do NOT stop or kill the backend server
4. If the backend crashed, restart it from `/workspace/vibe-tracker`

### Quick Reference

```bash
# Rebuild frontend
cd /workspace/vibe-tracker/frontend && npm run build

# Check backend is running
curl -s http://localhost:61000 | head -5

# Backend serves on port 61000 — do not kill it
```

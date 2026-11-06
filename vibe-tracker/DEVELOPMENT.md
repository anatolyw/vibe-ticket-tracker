# Development

## Build from Source

```bash
# Install dependencies
cd backend && npm install && cd ../frontend && npm install && cd ..

# Build server and UI
npm run build
```

## Running Locally

```bash
# Build everything, then start the server
mkdir -p dist-server
cp -r backend/dist/* dist-server/ 
node dist-server/cli.js --help
node dist-server/cli.js start --port 61001
```

## Development Workflow

```bash
# Watch Angular changes
cd frontend && npx ng build --configuration production --watch

# Watch TypeScript server changes
cd backend && npx tsc --project tsconfig.server.json --watch

# Start the server (after building)
mkdir -p dist-server 
cp -r backend/dist/* dist-server/ 
node dist-server/cli.js start --port 61001 --dev
```

## Running E2E Tests

The project has E2E tests for both the API (backend) and the UI (frontend).

```bash
# Backend E2E tests are self-contained — they build + start their own server on port 61001
cd backend && npx playwright test

# Frontend E2E tests require the server running on port 61000
# 1. Build and start the server (from $PROJ/vibe-tracker dir)
npm run build 
mkdir -p dist-server 
cp -r backend/dist/* dist-server/
node dist-server/cli.js start --port 61000 --dev

# 2. Run UI E2E tests
cd frontend && npx playwright test
```

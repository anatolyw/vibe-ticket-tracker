# Vibe Ticket Tracker — npm Publishing Tutorial

## Prerequisites

```bash
# Ensure Node.js 18+ is installed
node --version

# Ensure npm is installed
npm --version
```

## Step 1: Create npm Account

1. Go to [https://www.npmjs.com/signup](https://www.npmjs.com/signup)
2. Create your account (email verification required)
3. Verify your email address

## Step 2: Login from Terminal

```bash
npm login
```

You'll be prompted for:
- **Username**: your npm username
- **Password**: your npm password
- **Email**: your email address

Verify login:
```bash
npm whoami
# Should return your username
```

## Step 3: Review the Package

```bash
cd /workspace/vibe-tracker

# Dry-run publish to verify build + contents
# This triggers prepublishOnly which builds everything
npm publish --dry-run

# Check existing package info
npm view vibe-ticket-tracker --json 2>/dev/null || echo "Not yet published (expected)"
```

You should see the build output followed by multiple files in the tarball including `dist-server/`, `dist-ui/`, `backend/bin/`, and all documentation files.

## Step 4: Tag the Version in Git

```bash
cd /workspace/vibe-tracker

# Commit all changes
git add -A
git commit -m "Prepare for npm publishing v1.0.0"

# Create a git tag
git tag -a v1.0.0 -m "Version 1.0.0 - Initial npm release"

# Push to remote
git push origin main
git push origin v1.0.0
```

## Step 5: Publish to npm

**To actually publish:**
```bash
cd /workspace/vibe-tracker
npm publish
```

**If you want to publish to the public registry (not a scoped package):**
```bash
npm publish --access public
```

The package will be available at: `https://www.npmjs.com/package/vibe-ticket-tracker`

## Step 6: Verify Publication

```bash
# Check the package info
npm view vibe-ticket-tracker

# Test installation in a fresh directory
mkdir /tmp/vibe-tracker-example-project && cd /tmp/vibe-tracker-example-project
npm init -y
npm install vibe-ticket-tracker

# Verify the CLI works
npx vibe-ticket-tracker --help

# Initialize in a test project
npx vibe-ticket-tracker init

# Start the server
npx vibe-ticket-tracker start
```

## Step 7: Subsequent Releases

When you're ready to publish a new version:

```bash
# Bump the version
npm version 1.1.0

# Push and publish
git push origin main --tags
npm publish
# prepublishOnly runs automatically — no manual build needed
```

## Important Notes

1. **Package name uniqueness**: If `vibe-ticket-tracker` is already taken, use a scoped name like `@anatolyw/vibe-ticket-tracker` by changing the `name` field in `package.json` to `"@anatolyw/vibe-ticket-tracker"`.

2. **Scoped packages** require `--access public` on first publish:
   ```bash
   npm publish --access public
   ```

3. **Version constraints**: The package requires `node >= 18.0.0` (specified in `engines`).

4. **What users install**: When users run `npm install vibe-ticket-tracker`, they get:
   - A `vibe-ticket-tracker` CLI command (via `bin`)
   - The compiled Express server
   - The built Angular UI
   - No source code, no `node_modules`, no build tools

5. **Build at publish time**: The `prepublishOnly` script checks if `backend/dist` and `frontend/dist/ui/browser` exist. If they are missing, it runs `npm run build` first, then copies output to `dist-server/` and `dist-ui/`, and injects version. You still need to run `npm install` (root + backend + frontend) beforehand so the build tools are available.

6. **Local testing**: To test the package locally without publishing, you can install from the local directory:
   ```bash
   npm install /workspace/vibe-tracker
   ```

## Testing Locally

Use these commands to verify the package before publishing:

```bash
cd /workspace/vibe-tracker

# Clean previous build results
npm run clean

# Install dependencies
npm install && cd frontend && npm install && cd ../backend && npm install && cd ..

# Create the tarball (prepack runs automatically, copying pre-built output)
npm pack
# → Produces vibe-ticket-tracker-1.0.0.tgz

# Install from the tarball into a test directory
mkdir /tmp/vibe-tracker-example-project && cd /tmp/vibe-tracker-example-project
npm init -y
npm uninstall vibe-ticket-tracker 2>/dev/null # clear cache
npm install /workspace/vibe-tracker/vibe-ticket-tracker-1.0.0.tgz

# Verify the CLI works
npx vibe-ticket-tracker --help

# Initialize in the test project
npx vibe-ticket-tracker init --port 61000

# Start the server
npx vibe-ticket-tracker start
```

### Lifecycle Scripts Reference

| Script | When it runs | Purpose |
|--------|-------------|---------|
| `prepack` | Before `npm pack` | Checks if `backend/dist` and `frontend/dist/ui/browser` exist. If missing, runs `npm run build`. Then copies output to `dist-server/` and `dist-ui/`, injects version into `index.html` |
| `prepublishOnly` | Before `npm publish` | Same as `prepack` — conditionally builds, copies, and injects before uploading to npm |
| `build:server` | Manual or via lifecycle | Compiles TypeScript server |
| `build:ui` | Manual or via lifecycle | Builds Angular UI |
| `build` | Manual or via lifecycle | Runs both `build:server` and `build:ui` |
| `clean` | Manual | Removes all build output from root + backend + frontend |

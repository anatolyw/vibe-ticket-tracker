---
id: issue-00007
title: Hardening of the Safeguards
type: plan
status: open
created: 2026-10-30T00:00:00.000Z
updated: 2026-10-30T00:00:00.000Z
---

## Description

The `secure-read` plugin is currently active and blocks direct `.env` file access via both the `read` and `shell` tools. This is a solid first-line defense, but additional safeguards should be layered to ensure sensitive information cannot leak into the codebase and be committed to the public git repo.

## Context

- The `secure-read` plugin successfully blocks `.env` file reads via tools and shell commands.
- However, environment variables can still be accidentally leaked through other channels (e.g., hardcoded values, log output, error messages).
- We need defense-in-depth: multiple independent checks at different stages (tool-time, pre-commit, CI).

## Tasks

### 1. Pre-commit Git Hook

- [ ] Create a `.git-hooks/pre-commit` script that scans staged files for patterns resembling `.env` file contents.
- [ ] Detect common sensitive patterns: `API_KEY`, `SECRET`, `PASSWORD`, `TOKEN`, `PRIVATE_KEY`, database connection strings.
- [ ] Block the commit and print a clear error message with suggestions on how to fix.
- [ ] Integrate with the existing `.husky` or git hooks setup.

### 2. Strengthen `.gitignore`

- [ ] Verify `.env` and all environment file variants (`.env.local`, `.env.production`, `.env.development`, `.env.*.local`) are covered.
- [ ] Add rules to prevent accidentally committed dotenv-style files from any directory.
- [ ] Document the `.gitignore` policy in README.md.

### 3. Secret Scanning Tooling

- [ ] Integrate `detect-secrets` (or `git-secrets`) into the pre-commit workflow.
- [ ] Run a baseline scan of the existing codebase to ensure no secrets are already committed.
- [ ] Configure scan rules appropriate for the project (Node.js, Angular, backend service).
- [ ] Add a CI step that runs the same secret scanning on every PR.

### 4. Environment Variable Validation

- [ ] Add runtime checks that verify required env vars exist (fail fast with a clear error) rather than silently falling back to defaults.
- [ ] Ensure no default values contain actual secrets (only placeholder strings like `"change-me"`).
- [ ] Add a startup validation script that lists required env vars and checks they are set.

### 5. Plugin Enhancement (Optional)

- [ ] Extend `secure-read` to also block shell commands that echo, grep, or export environment variables.
- [ ] Add blocking for `process.env.*` access in generated code if detectable.
- [ ] Consider adding a `git-commit` transform guard that scans diff content for secret-like patterns.

## Notes

- The goal is defense-in-depth, not reliance on a single tool.
- All safeguards should provide clear, actionable error messages to the developer.
- Avoid overly aggressive rules that generate too many false positives — tune carefully.

## Changes

### Files modified
- (pending)

### Code changes summary
- (pending)

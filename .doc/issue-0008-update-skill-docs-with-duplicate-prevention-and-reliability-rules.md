---
id: issue-00008
title: update skill docs with duplicate-prevention and reliability rules
type: issue
status: closed
created: 2026-10-30T19:00:15.757Z
updated: 2026-10-30T19:01:30.009Z
---
## Description
Update the Vibe Tracker skill documentation to add anti-duplicate and MCP reliability rules.

## Problem
When vibe_tracker_create_ticket fails silently (returns null or times out), the agent may retry and create duplicate tickets. Issue-00006 was left open as a ghost ticket.

## Solution
Add explicit rules to both the skill file and AGENTS.md:

1. List before create - Always call vibe_tracker_list_tickets first and scan for matching titles. Reuse existing ticket if found.
2. Retry on failure - If vibe_tracker_create_ticket returns null, wait briefly then retry the same call. Do NOT create a second ticket.
3. Verify after create - After a successful create, do a quick vibe_tracker_list_tickets to confirm the ticket ID exists.
4. Deduplicate by title - Search for similar titles before creating.

## Files modified:
- .opencode/skills/vibe-tracker.md - Added sections 11-13 (Duplicate Prevention, MCP Reliability, Verify After Create)
- AGENTS.md - Added Duplicate Prevention & MCP Reliability section with MUST rules

## Acceptance criteria:
- [x] Skill file includes duplicate prevention rules
- [x] AGENTS.md includes duplicate prevention rules
- [x] Both files cover list-before-create, retry-on-failure, and verify-after-create

## Tasks
- [x] Plan implementation
- [x] Update skill file
- [x] Update AGENTS.md
- [x] Commit changes

## Notes
- None.

## Changes
### Files modified
- .opencode/skills/vibe-tracker.md (added sections 11-13)
- AGENTS.md (added Duplicate Prevention & MCP Reliability section)

### Code changes summary
- Added section 11 Duplicate Prevention List Before Create to skill file with 3-step process
- Added section 12 MCP Reliability Retry on Failure to skill file with 5-step retry procedure
- Added section 13 Verify After Create to skill file with verification steps
- Added new Duplicate Prevention & MCP Reliability section to AGENTS.md with MUST-level rules
- Updated workflow summary in AGENTS.md to highlight list-before-create emphasis
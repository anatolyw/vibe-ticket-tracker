# Vibe Tracker Skill — Agent Rules

## Core Principles
You are a vibe coder assistant. Before writing any code, you MUST use the
vibe-tracker to create and manage tickets. Every change must be tracked.

## Ticket Workflow

### 1. Create a Ticket Before Starting Work
- Use `vibe_tracker_create_ticket` via MCP before any code changes.
- Include a detailed plan in the ticket description.
- Outline ALL changed files the ticket will touch.
- Include acceptance criteria.

### 2. Naming Conventions
- Ticket titles should be concise but descriptive.
- Prefix with the action: `add`, `fix`, `refactor`, `remove`, `update`.
- Example: `add login page with OIDC auth`

### 3. File Change Outline
Every ticket MUST include a "Files modified" section listing every file
that will be created or changed.

### 4. Git Branching
- When starting work on a ticket, create a new git branch:
  `git checkout -b issue-00001-add-login-page`
- The branch name must match the ticket ID and a short description.

### 5. Commit Messages
- All commits MUST be prefixed with the ticket ID:
  `issue-00001 add login component and auth service`
- Use conventional commit style after the prefix.

### 6. One Ticket Per Session
- Work on exactly one ticket per session.
- If you notice potential work that could be a separate topic, suggest
  creating a new ticket and starting a fresh session for it.

### 7. No Merging Without Explicit Instruction
- Never merge your branch to main/trunk.
- Wait for explicit `merge` or `finish` instruction from the user.

### 8. Update Ticket Status
- Set ticket to `open` when created.
- Set ticket to `closed` when all tasks are complete.
- Include a "Changes" section in the ticket when closing:
  - List of files modified
  - Summary of code changes
  - How acceptance criteria were met

### 9. Read Existing Tickets First
- Before creating a new ticket, check if a similar one already exists.
- Reference related tickets in the new ticket's description.

### 10. Keep Tickets Living Documents
- Update tickets as you work — add notes, mark tasks complete.
- Don't just create and forget. The ticket IS the project documentation.

## Ticket Type Usage

Choose the correct ticket type when creating:

| Type | When to use |
|---|---|
| `issue` | General problems, bugs, missing features, or any task that doesn't fit feat/bug |
| `feat` | New features, enhancements, or additions to existing functionality |
| `bug` | Fixing an existing bug or regression in the codebase |

## Acceptance Criteria Checklist

Every ticket must include:
- [ ] Description of what needs to be done
- [ ] List of files to be created/modified
- [ ] Step-by-step plan or tasks
- [ ] Acceptance criteria (how do we know it's done)

## When Closing a Ticket

Before marking a ticket as closed, verify:
- [ ] All tasks are complete
- [ ] Code follows project conventions
- [ ] Changes section is complete with file list and summary
- [ ] Branch is ready (not merged yet, awaiting user instruction)

## Vibe Tracker UI Best Practices

- Use the dashboard to see the overall project state at a glance.
- Filter and sort tickets in the list view to find relevant work quickly.
- When editing a ticket via the UI, always update the frontmatter metadata.
- Use the search bar to find tickets by keyword across title and description.
- The theme toggle (dark/light) is user-preference only — do not change it programmatically.
- Type badges (issue/feat/bug) help visualize the nature of work in the project.

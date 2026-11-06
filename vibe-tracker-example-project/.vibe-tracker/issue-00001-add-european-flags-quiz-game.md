---
id: issue-00001
title: add european flags quiz game
type: feat
status: closed
created: 2026-11-05T09:19:33.234Z
updated: 2026-11-05T09:22:28.466Z
---
Create a JavaScript file that I can run with Node.js.

Add a command to package.json so I can run it as `npm run emoji`.

## Script purpose:
- Simple game to test knowledge of European flags
- Shows an emoji flag in an endless loop
- Expects the user to type the case-insensitive country name
- Prints "Correct" in green for right answers, "Wrong" in red for wrong answers
- Keeps a running tally of correct/wrong answers
- `/stats` command prints statistics
- Exit with Ctrl+C

## Files modified
- package.json (add `emoji` script)

## Files created
- scripts/emoji-quiz.js (the quiz game)

## Acceptance criteria
- [x] Script runs with `npm run emoji`
- [x] Shows random European flag emoji
- [x] Accepts case-insensitive country name input
- [x] Shows green "Correct" for right answers
- [x] Shows red "Wrong" for wrong answers
- [x] `/stats` prints statistics
- [x] Ctrl+C exits gracefully

## Changes
- Created `scripts/emoji-quiz.js` with 48 European countries and their flag emojis
- Script uses Node.js readline for interactive input
- Color-coded output: green for correct, red for wrong
- Running tally of correct/wrong answers with percentage score
- `/stats` command shows live statistics anytime during play
- Graceful Ctrl+C (SIGINT) handler prints final statistics
- Added `"emoji": "node scripts/emoji-quiz.js"` to package.json scripts

<!-- Generated with vibe-ticket-tracker · https://github.com/anatolyw/vibe-ticket-tracker -->

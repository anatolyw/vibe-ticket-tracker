# Vibe Ticket Tracker — Frontend

Angular 19 application with Tailwind CSS v4 and Lucide icons.

## Structure

```
frontend/
├── public/           — Static assets (favicon, etc.)
├── src/
│   ├── components/   — Standalone Angular components
│   │   ├── app-header/
│   │   ├── app-sidebar/
│   │   ├── dashboard/
│   │   ├── ticket-create/
│   │   ├── ticket-detail/
│   │   └── ticket-list/
│   ├── lib/          — Shared services & components
│   │   ├── api.service.ts
│   │   ├── lucide-icon.component.ts
│   │   └── theme.service.ts
│   ├── app.component.ts
│   ├── app.config.ts
│   ├── main.ts
│   ├── styles.css    — Tailwind CSS + prose styles
│   ├── index.html
│   └── tsconfig.app.json
├── e2e/              — Playwright end-to-end tests
├── angular.json
├── tsconfig.json
├── tsconfig.app.json
├── playwright.config.ts
├── postcss.config.json
├── README.md
└── .gitignore
```

## Prerequisites

**Install Playwright browsers** (required once per machine):

```bash
# Linux (installs system deps + browser in one step)
npx playwright install --with-deps chromium
```

## Commands

All scripts are run from the **repo root** unless noted.

```bash
# Build the Angular production bundle
npm run build:ui

# Full build (server + UI)
npm run build

# Start the server so the UI is served (from $PROJ/vibe-tracker dir)
mkdir -p dist-server
cp -r backend/dist/* dist-server/
node dist-server/cli.js start --port 61000

# Run E2E tests (requires backend server running on port 61000)
cd frontend && npx playwright test

# Interactive mode (opens browser)
cd frontend && npx playwright test --headed
```

## Styles

- **Tailwind CSS v4** with `@tailwindcss/postcss` for utility-first CSS
- **Dark mode** via CSS class toggle on `<html>`
- **Prose styles** for markdown content in ticket detail view (hand-written)
- **PostCSS** config: `postcss.config.json` (required by Angular — not `.js`)

## Components

| Component        | Purpose                           |
|------------------|-----------------------------------|
| `app-header`     | Top navigation bar                |
| `app-sidebar`    | Collapsible sidebar with nav      |
| `dashboard`      | Overview dashboard (home)         |
| `ticket-list`    | Paginated, filterable ticket list |
| `ticket-detail`  | View/edit a single ticket         |
| `ticket-create`  | Create new ticket form            |

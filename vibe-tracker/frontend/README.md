# Vibe Tracker — Frontend

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
# macOS
npx playwright install chromium

# Linux (installs system deps + browser in one step)
npx playwright install --with-deps chromium
```

## Build

From repo root:
```bash
npm run build:ui       # Build Angular production bundle
```

From `frontend/` directory:
```bash
npm run build          # Build production bundle (dist/ui/browser/)
```

## E2E Tests

```bash
# Build and start the server (from repo root)
npm run build && node backend/dist/index.js &

# From frontend/
npm run test:e2e

# Interactive mode (opens the browser)
npx playwright test --headed
```

**Clean up:**
```bash
kill %1   # or: pkill -f "node backend/dist/index.js"
```

**Note:** The backend also has its own E2E tests in `backend/e2e/` that test API and MCP features directly (see the [root README](../README.md) for details).

## Styles

- **Tailwind CSS v4** with `@tailwindcss/postcss` for utility-first CSS
- **Dark mode** via CSS class toggle on `<html>`
- **Prose styles** for markdown content in ticket detail view (hand-written, not from `@tailwindcss/typography`)
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

import express from 'express';
import cors from 'cors';
import { resolve, join } from 'node:path';
import { loadConfig } from './storage/config.js';
import type { VibeTrackerConfig } from './storage/ticket.js';
import { createTicketRouter } from './api/tickets.js';
import { createMCPEndpoint } from './mcp/index.js';

export function createApp(config: VibeTrackerConfig, baseDir: string, distDir: string): express.Application {
  const app = express();
  const docRoot = join(baseDir, config.VIBE_TRACKER_DOC_ROOT);

  // Middleware
  app.use(cors());
  app.use(express.json({ limit: '1mb' }));

  // API routes
  app.use('/api/tickets', createTicketRouter(config, baseDir));

  // MCP endpoint
  app.use('/mcp', createMCPEndpoint(config, baseDir));

  // Serve Angular static files
  const staticPath = resolve(distDir);
  app.use(express.static(staticPath));

  // SPA fallback
  app.get('*', (req, res) => {
    res.sendFile(resolve(staticPath, 'index.html'));
  });

  return app;
}

export function startServer(app: express.Application, port: number): void {
  app.listen(port, () => {
    console.log(`Vibe Tracker running at http://localhost:${port}`);
  });
}

// If run directly with baseDir and port args
if (process.argv.length >= 4) {
  const baseDir = process.argv[2];
  const port = parseInt(process.argv[3]);
  const config = loadConfig(baseDir);
  const distDir = resolve(baseDir, 'dist', 'ui');
  const app = createApp(config, baseDir, distDir);
  startServer(app, port);
}

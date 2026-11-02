import { Router, Request, Response, NextFunction } from 'express';
import { readFileSync } from 'node:fs';
import {
  getAllTickets,
  getTicket,
  getTicketSummaries,
  createTicket,
  updateTicket,
  deleteTicket,
  VibeTrackerConfig,
  Ticket,
  TicketFrontmatter,
  getDocRoot,
} from '../storage/ticket.js';
import { resolve } from 'node:path';

export function createTicketRouter(config: VibeTrackerConfig, baseDir: string): Router {
  const router = Router();
  const docRoot = getDocRoot(config, baseDir);

  // GET /api/tickets
  router.get('/', (req: Request, res: Response) => {
    const { status, type, search, sort = 'updated', order = 'desc', limit = 50, offset = 0 } = req.query;

    let tickets = getAllTickets(config, docRoot);

    // Filter by status
    if (status && typeof status === 'string') {
      tickets = tickets.filter(t => t.status === status);
    }

    // Filter by type
    if (type && typeof type === 'string') {
      tickets = tickets.filter(t => t.type === type);
    }

    // Search
    if (search && typeof search === 'string' && search) {
      const q = search.toLowerCase();
      tickets = tickets.filter(t =>
        t.title.toLowerCase().includes(q) ||
        t.body.raw.toLowerCase().includes(q)
      );
    }

    // Sort
    tickets.sort((a, b) => {
      const dir = order === 'asc' ? 1 : -1;
      if (sort === 'title') return dir * a.title.localeCompare(b.title);
      return dir * (new Date(a.updated).getTime() - new Date(b.updated).getTime());
    });

    // Paginate
    const total = tickets.length;
    const sliced = tickets.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      tickets: sliced,
      pagination: {
        total,
        limit: Number(limit),
        offset: Number(offset),
        hasMore: Number(offset) + Number(limit) < total,
      },
    });
  });

  // GET /api/tickets/summaries
  router.get('/summaries', (req: Request, res: Response) => {
    const summaries = getTicketSummaries(config, docRoot);
    res.json(summaries);
  });

  // GET /api/tickets/:id
  router.get('/:id', (req: Request, res: Response) => {
    const ticket = getTicket(config, docRoot, req.params.id as string);
    if (!ticket) {
      res.status(404).json({ error: `Ticket "${req.params.id}" not found` });
      return;
    }
    res.json(ticket);
  });

  // GET /api/tickets/:id/raw
  router.get('/:id/raw', (req: Request, res: Response) => {
    const ticket = getTicket(config, docRoot, req.params.id as string);
    if (!ticket) {
      res.status(404).json({ error: `Ticket "${req.params.id}" not found` });
      return;
    }
    res.set('Content-Type', 'text/markdown');
    // Re-read raw from file for consistency
    const raw = readFileSync(ticket.filePath, 'utf-8');
    res.send(raw);
  });

  // POST /api/tickets
  router.post('/', (req: Request, res: Response) => {
    const { title, type = 'issue', description } = req.body;
    if (!title || typeof title !== 'string' || !title.trim()) {
      res.status(400).json({ error: 'Title is required' });
      return;
    }
    const result = createTicket(config, docRoot, title, type, description || '');
    if (result === null) {
      res.status(500).json({ error: 'Failed to create ticket' });
      return;
    }
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.status(201).json(result);
  });

  // PUT /api/tickets/:id
  router.put('/:id', (req: Request, res: Response) => {
    const { title, type, status, body } = req.body;
    const updates: Partial<TicketFrontmatter & { body?: string }> = {};
    if (title !== undefined) updates.title = title;
    if (type !== undefined) updates.type = type;
    if (status !== undefined) updates.status = status;
    if (body !== undefined) updates.body = body;

    if (Object.keys(updates).length === 0) {
      res.status(400).json({ error: 'No fields to update' });
      return;
    }

    const result = updateTicket(config, docRoot, req.params.id as string, updates);
    if ('error' in result) {
      res.status(400).json({ error: result.error });
      return;
    }
    res.json(result);
  });

  // DELETE /api/tickets/:id
  router.delete('/:id', (req: Request, res: Response) => {
    const deleted = deleteTicket(config, docRoot, req.params.id as string);
    if (!deleted) {
      res.status(404).json({ error: `Ticket "${req.params.id}" not found` });
      return;
    }
    res.json({ success: true, id: req.params.id });
  });

  return router;
}

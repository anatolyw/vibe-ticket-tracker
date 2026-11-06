import { Router, Request, Response } from 'express';
import {
  getAllTickets,
  getTicket,
  getTicketSummaries,
  createTicket,
  updateTicket,
  deleteTicket,
  VibeTrackerConfig,
  TicketFrontmatter,
  getDocRoot,
} from '../storage/ticket.js';
import { VibeTrackerConfig as Config } from '../storage/config.js';

// MCP Protocol types
interface MCPRequest {
  jsonrpc: '2.0';
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface MCPNotification {
  jsonrpc: '2.0';
  method: string;
  params?: Record<string, unknown>;
}

interface MCPResponse {
  jsonrpc: '2.0';
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

interface MCPToolsList {
  tools: Array<{
    name: string;
    description: string;
    inputSchema: Record<string, unknown>;
  }>;
}

interface MCPResourceTemplate {
  uriTemplate: string;
  name: string;
  description: string;
  mimeType?: string;
}

export function createMCPEndpoint(config: VibeTrackerConfig, baseDir: string): Router {
  const router = Router();
  const docRoot = getDocRoot(config, baseDir);

  router.post('/', (req: Request, res: Response) => {
    const body = req.body as MCPRequest | MCPNotification;

    if (!body || !body.jsonrpc) {
      res.status(400).json({ jsonrpc: '2.0', error: { code: -32600, message: 'Invalid Request' } });
      return;
    }

    const response: MCPResponse = {
      jsonrpc: '2.0',
      id: (body as MCPRequest).id ?? null,
    };

    // Initialize
    if (body.method === 'initialize') {
      response.result = {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {
            listChanged: false,
          },
          resources: {
            subscribe: false,
            listChanged: false,
          },
        },
        serverInfo: {
          name: 'vibe-ticket-tracker',
          version: '1.0.0',
        },
      };

      // Send initialized notification
      res.json([
        response,
        { jsonrpc: '2.0', method: 'notifications/initialized' },
      ]);
      return;
    }

    // Tool list
    if (body.method === 'tools/list') {
      response.result = {
        tools: [
          {
            name: 'vibe_tracker_create_ticket',
            description: 'Create a new ticket in the Vibe Ticket Tracker',
            inputSchema: {
              type: 'object',
              required: ['title', 'type'],
              properties: {
                title: { type: 'string', description: 'Ticket title' },
                type: { type: 'string', enum: config.VIBE_TRACKER_TICKET_TYPE_OPTIONS, description: 'Ticket type' },
                description: { type: 'string', description: 'Ticket description' },
              },
            },
          },
          {
            name: 'vibe_tracker_update_ticket',
            description: 'Update an existing ticket',
            inputSchema: {
              type: 'object',
              required: ['ticket_id'],
              properties: {
                ticket_id: { type: 'string', description: 'Ticket ID (e.g., issue-00001)' },
                title: { type: 'string', description: 'New title' },
                type: { type: 'string', description: 'New type' },
                status: { type: 'string', enum: ['open', 'closed'], description: 'New status' },
                body: { type: 'string', description: 'New body (markdown)' },
              },
            },
          },
          {
            name: 'vibe_tracker_delete_ticket',
            description: 'Delete a ticket',
            inputSchema: {
              type: 'object',
              required: ['ticket_id'],
              properties: {
                ticket_id: { type: 'string', description: 'Ticket ID to delete' },
              },
            },
          },
          {
            name: 'vibe_tracker_list_tickets',
            description: 'List tickets with optional filters',
            inputSchema: {
              type: 'object',
              properties: {
                status: { type: 'string', enum: ['open', 'closed'], description: 'Filter by status' },
                type: { type: 'string', enum: config.VIBE_TRACKER_TICKET_TYPE_OPTIONS, description: 'Filter by type' },
                limit: { type: 'number', description: 'Max results', default: 50 },
                offset: { type: 'number', description: 'Pagination offset', default: 0 },
                sort_by: { type: 'string', enum: ['created', 'updated', 'title'], description: 'Sort field' },
                sort_order: { type: 'string', enum: ['asc', 'desc'], description: 'Sort order' },
              },
            },
          },
          {
            name: 'vibe_tracker_get_ticket',
            description: 'Get a single ticket by ID',
            inputSchema: {
              type: 'object',
              required: ['ticket_id'],
              properties: {
                ticket_id: { type: 'string', description: 'Ticket ID (e.g., issue-00001)' },
              },
            },
          },
        ],
      };
      res.json(response);
      return;
    }

    // Resource templates list
    if (body.method === 'resources/templates/list') {
      response.result = {
        templates: [
          {
            uriTemplate: 'vibe://tickets/{id}',
            name: 'vibe://tickets/{id}',
            description: 'Full ticket content as rendered markdown',
            mimeType: 'text/markdown',
          },
          {
            uriTemplate: 'vibe://tickets/{id}/raw',
            name: 'vibe://tickets/{id}/raw',
            description: 'Raw markdown source',
            mimeType: 'text/markdown',
          },
          {
            uriTemplate: 'vibe://tickets/{id}/metadata',
            name: 'vibe://tickets/{id}/metadata',
            description: 'Ticket metadata as JSON',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'vibe://tickets/',
            name: 'vibe://tickets/',
            description: 'Index of all tickets',
            mimeType: 'application/json',
          },
          {
            uriTemplate: 'vibe://config',
            name: 'vibe://config',
            description: 'Current vibe-ticket-tracker configuration',
            mimeType: 'application/json',
          },
        ],
      };
      res.json(response);
      return;
    }

    // Tool call
    if (body.method === 'tools/call') {
      const { name, arguments: args } = (body.params || {}) as { name: string; arguments?: Record<string, unknown> };

      try {
        switch (name) {
          case 'vibe_tracker_create_ticket': {
            const title = args?.title as string;
            const type = (args?.type as string) || config.VIBE_TRACKER_TICKET_TYPE_OPTIONS[0];
            const description = args?.description as string || '';
            if (!title) throw new Error('title is required');
            const ticket = createTicket(config, docRoot, title, type, description);
            if (ticket === null) throw new Error('Failed to create ticket');
            if ('error' in ticket) throw new Error(ticket.error);
            response.result = ticket;
            break;
          }
          case 'vibe_tracker_update_ticket': {
            const ticketId = args?.ticket_id as string | undefined;
            const updates: Partial<TicketFrontmatter & { body?: string }> = {};
            if (args?.title !== undefined) updates.title = args.title as string;
            if (args?.type !== undefined) updates.type = args.type as string;
            if (args?.status !== undefined) updates.status = args.status as 'open' | 'closed';
            if (args?.body !== undefined) updates.body = args.body as string;
            if (!ticketId) throw new Error('ticket_id is required');
            if (Object.keys(updates).length === 0) throw new Error('No fields to update');
            const ticket = updateTicket(config, docRoot, ticketId, updates);
            if (ticket === null) throw new Error('Failed to update ticket');
            if ('error' in ticket) throw new Error(ticket.error);
            response.result = ticket;
            break;
          }
          case 'vibe_tracker_delete_ticket': {
            const ticketId = args?.ticket_id as string;
            if (!ticketId) throw new Error('ticket_id is required');
            const deleted = deleteTicket(config, docRoot, ticketId);
            if (!deleted) throw new Error(`Ticket "${ticketId}" not found`);
            response.result = { success: true, id: ticketId };
            break;
          }
          case 'vibe_tracker_list_tickets': {
            const { status, type, limit = 50, offset = 0, sort_by = 'updated', sort_order = 'desc' } = args || {};
            let tickets = getAllTickets(config, docRoot);
            if (status && typeof status === 'string') tickets = tickets.filter(t => t.status === status);
            if (type && typeof type === 'string') tickets = tickets.filter(t => t.type === type);
            tickets.sort((a, b) => {
              const dir = sort_order === 'asc' ? 1 : -1;
              if (sort_by === 'title') return dir * a.title.localeCompare(b.title);
              return dir * (new Date(b.updated).getTime() - new Date(a.updated).getTime());
            });
            const sliced = tickets.slice(Number(offset), Number(offset) + Number(limit));
            response.result = { tickets: sliced, total: tickets.length };
            break;
          }
          case 'vibe_tracker_get_ticket': {
            const ticketId = args?.ticket_id as string;
            if (!ticketId) throw new Error('ticket_id is required');
            const ticket = getTicket(config, docRoot, ticketId);
            if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);
            response.result = ticket;
            break;
          }
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        response.error = { code: -32603, message };
      }
      res.json(response);
      return;
    }

    // Resource read
    if (body.method === 'resources/read') {
      const { uri } = (body.params || {}) as { uri?: string };
      if (!uri) {
        response.error = { code: -32602, message: 'uri is required' };
        res.json(response);
        return;
      }

      try {
        if (uri === 'vibe://config') {
          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(config, null, 2),
            }],
          };
        } else if (uri === 'vibe://tickets/') {
          const summaries = getTicketSummaries(config, docRoot);
          response.result = {
            contents: [{
              uri,
              mimeType: 'application/json',
              text: JSON.stringify(summaries, null, 2),
            }],
          };
        } else {
          const match = uri.match(/^vibe:\/\/tickets\/([^/]+)(?:\/(\w+))?$/);
          if (match) {
            const [_, ticketId, variant] = match;
            const ticket = getTicket(config, docRoot, ticketId);
            if (!ticket) throw new Error(`Ticket "${ticketId}" not found`);

            if (variant === 'raw') {
              response.result = {
                contents: [{ uri, mimeType: 'text/markdown', text: ticket.body.raw }],
              };
            } else if (variant === 'metadata') {
              response.result = {
                contents: [{
                  uri,
                  mimeType: 'application/json',
                  text: JSON.stringify({ id: ticket.id, title: ticket.title, type: ticket.type, status: ticket.status, created: ticket.created, updated: ticket.updated }, null, 2),
                }],
              };
            } else {
              response.result = {
                contents: [{
                  uri,
                  mimeType: 'text/markdown',
                  text: ticket.body.html,
                }],
              };
            }
          } else {
            throw new Error(`Unknown resource: ${uri}`);
          }
        }
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : 'Unknown error';
        response.error = { code: -32603, message };
      }
      res.json(response);
      return;
    }

    // Unknown method
    response.error = { code: -32601, message: `Method not found: ${body.method}` };
    res.json(response);
  });

  return router;
}

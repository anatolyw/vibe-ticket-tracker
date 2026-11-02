import { test, expect } from 'playwright/test';

import { createAndCleanup } from './shared/test-helpers.js';
import { mcpListTools, mcpCallTool, mcpInitialize } from './shared/make-request.js';

test.describe('Backend E2E — MCP: Tools List & Initialize', () => {

  test('MCP initialize returns valid response', async ({ request }) => {
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'init-test',
        method: 'initialize',
        params: {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          clientInfo: { name: 'test', version: '0.1.0' },
        },
      },
    });
    expect(res.status()).toBe(200);
    // The MCP endpoint returns [initializeResponse, notification] as an array
    const body = await res.json() as Array<Record<string, unknown>>;
    expect(Array.isArray(body)).toBeTruthy();
    const initResponse = body[0];
    expect(initResponse.result).toBeDefined();
    expect(initResponse.result?.protocolVersion).toBe('2024-11-05');
    expect(initResponse.result?.serverInfo?.name).toBe('vibe-tracker');
    expect(initResponse.result?.capabilities).toHaveProperty('tools');
    expect(initResponse.result?.capabilities).toHaveProperty('resources');
    // Second element is the initialized notification
    expect(body[1].method).toBe('notifications/initialized');
  });

  test('MCP initialize without jsonrpc returns error', async ({ request }) => {
    const res = await request.post('http://localhost:61001/mcp', {
      data: { method: 'initialize', params: {} },
    });
    // MCP handler returns HTTP 400 for invalid requests
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32600);
    expect(body.error?.message).toBe('Invalid Request');
  });

  test('MCP tools/list returns 5 tools', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string }>} | undefined)?.tools;
    expect(Array.isArray(tools)).toBeTruthy();
    expect(tools!.length).toBe(5);
  });

  test('tools/list returns create_ticket tool with correct schema', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const createTool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_create_ticket');
    expect(createTool).toBeDefined();
    const schema = createTool!.inputSchema as Record<string, unknown>;
    expect(schema.required).toContain('title');
    expect(schema.required).toContain('type');
    expect(schema.properties).toHaveProperty('title');
    expect(schema.properties).toHaveProperty('type');
    expect(schema.properties).toHaveProperty('description');
  });

  test('tools/list returns update_ticket tool with correct schema', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const tool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_update_ticket');
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as Record<string, unknown>;
    expect(schema.required).toContain('ticket_id');
    expect(schema.properties).toHaveProperty('title');
    expect(schema.properties).toHaveProperty('type');
    expect(schema.properties).toHaveProperty('status');
    expect(schema.properties).toHaveProperty('body');
  });

  test('tools/list returns delete_ticket tool with correct schema', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const tool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_delete_ticket');
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as Record<string, unknown>;
    expect(schema.required).toContain('ticket_id');
    expect(schema.properties).toHaveProperty('ticket_id');
  });

  test('tools/list returns list_tickets tool with correct schema', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const tool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_list_tickets');
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as Record<string, unknown>;
    expect(schema.properties).toHaveProperty('status');
    expect(schema.properties).toHaveProperty('type');
    expect(schema.properties).toHaveProperty('limit');
    expect(schema.properties).toHaveProperty('offset');
    expect(schema.properties).toHaveProperty('sort_by');
    expect(schema.properties).toHaveProperty('sort_order');
  });

  test('tools/list returns get_ticket tool with correct schema', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const tool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_get_ticket');
    expect(tool).toBeDefined();
    const schema = tool!.inputSchema as Record<string, unknown>;
    expect(schema.required).toContain('ticket_id');
    expect(schema.properties).toHaveProperty('ticket_id');
  });

  test('tools/list type enum matches config options', async ({ request }) => {
    await mcpInitialize(request);
    const result = await mcpListTools(request);
    const tools = (result as { tools: Array<{ name: string; inputSchema: unknown }> }).tools;
    const createTool = tools.find((t: { name: string }) => t.name === 'vibe_tracker_create_ticket');
    const schema = createTool!.inputSchema as Record<string, unknown>;
    const typeProp = schema.properties?.type as Record<string, unknown> | undefined;
    expect(typeProp?.enum).toEqual(['issue', 'feat', 'bug']);
  });

  test('MCP call unknown tool returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'unknown_tool', {});
    expect(res.error).toBeDefined();
    expect(res.error?.code).toBe(-32603);
    expect(res.error?.message).toContain('Unknown tool');
  });

  test('MCP unknown method returns error', async ({ request }) => {
    const res = await request.post('http://localhost:61001/mcp', {
      data: {
        jsonrpc: '2.0',
        id: 'unknown-method',
        method: 'nonexistent_method',
      },
    });
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body.error).toBeDefined();
    expect(body.error?.code).toBe(-32601);
    expect(body.error?.message).toContain('Method not found');
  });
});

test.describe('Backend E2E — MCP: Create Ticket Tool', () => {test('vibe_tracker_create_ticket creates a ticket', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_create_ticket', {
      title: 'MCP create test',
      type: 'issue',
      description: 'Created via MCP',
    });
    expect(res.result).toBeDefined();
    const ticket = res.result as Record<string, unknown>;
    expect(ticket.title).toBe('MCP create test');
    expect(ticket.type).toBe('issue');
    expect(ticket.status).toBe('open');
    try {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    } catch { /* ignore */ }
  });

  test('vibe_tracker_create_ticket defaults type to first config option', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_create_ticket', {
      title: 'Default type test',
    });
    expect(res.result).toBeDefined();
    const ticket = res.result as Record<string, unknown>;
    expect(ticket.type).toBe('issue'); // First option in config
    try {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    } catch { /* ignore */ }
  });

  test('vibe_tracker_create_ticket with empty title returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_create_ticket', {
      title: '',
    });
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('title is required');
  });

  test('vibe_tracker_create_ticket with invalid type returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_create_ticket', {
      title: 'Bad type test',
      type: 'invalid',
    });
    expect(res.error).toBeDefined();
  });
});

test.describe('Backend E2E — MCP: Update Ticket Tool', () => {test('vibe_tracker_update_ticket updates title', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP update title');
    try {
      const res = await mcpCallTool(request, 'vibe_tracker_update_ticket', {
        ticket_id: ticket.id,
        title: 'Updated via MCP',
      });
      expect(res.result).toBeDefined();
      const updated = res.result as Record<string, unknown>;
      expect(updated.title).toBe('Updated via MCP');
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('vibe_tracker_update_ticket updates status', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'MCP update status');
    try {
      const res = await mcpCallTool(request, 'vibe_tracker_update_ticket', {
        ticket_id: ticket.id,
        status: 'closed',
      });
      expect(res.result).toBeDefined();
      const updated = res.result as Record<string, unknown>;
      expect(updated.status).toBe('closed');
    } finally {
      // Idempotent cleanup — don't fail if already deleted
      try {
        await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
      } catch { /* already deleted */ }
    }
  });

  test('vibe_tracker_update_ticket without ticket_id returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_update_ticket', {});
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('ticket_id is required');
  });

  test('vibe_tracker_update_ticket with no fields returns error', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP no fields test');
    try {
      const res = await mcpCallTool(request, 'vibe_tracker_update_ticket', {
        ticket_id: ticket.id,
      });
      expect(res.error).toBeDefined();
      expect(res.error?.message).toContain('No fields to update');
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('vibe_tracker_update_ticket on non-existent ticket returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_update_ticket', {
      ticket_id: 'issue-99999',
      title: 'ghost',
    });
    expect(res.error).toBeDefined();
  });
});

test.describe('Backend E2E — MCP: List & Get Ticket Tools', () => {test('vibe_tracker_list_tickets returns tickets', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP list test');
    try {
      const res = await mcpCallTool(request, 'vibe_tracker_list_tickets', {});
      expect(res.result).toBeDefined();
      const result = res.result as Record<string, unknown>;
      expect(result).toHaveProperty('tickets');
      expect(result).toHaveProperty('total');
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('vibe_tracker_list_tickets filters by status', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP list filter test');
    try {
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { status: 'closed' },
      });
      const res = await mcpCallTool(request, 'vibe_tracker_list_tickets', {
        status: 'closed',
      });
      expect(res.result).toBeDefined();
      const result = res.result as Record<string, unknown>;
      const tickets = result.tickets as Array<Record<string, unknown>>;
      expect(tickets.every((t: Record<string, unknown>) => t.status === 'closed')).toBeTruthy();
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('vibe_tracker_get_ticket returns a ticket', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP get test');
    try {
      const res = await mcpCallTool(request, 'vibe_tracker_get_ticket', {
        ticket_id: ticket.id,
      });
      expect(res.result).toBeDefined();
      const t = res.result as Record<string, unknown>;
      expect(t.id).toBe(ticket.id);
      expect(t.title).toBe('MCP get test');
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('vibe_tracker_get_ticket without ticket_id returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_get_ticket', {});
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('ticket_id is required');
  });

  test('vibe_tracker_get_ticket on non-existent ticket returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_get_ticket', {
      ticket_id: 'issue-99999',
    });
    expect(res.error).toBeDefined();
  });
});

test.describe('Backend E2E — MCP: Delete Ticket Tool', () => {test('vibe_tracker_delete_ticket deletes a ticket', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'MCP delete test');
    const res = await mcpCallTool(request, 'vibe_tracker_delete_ticket', {
      ticket_id: ticket.id,
    });
    expect(res.result).toBeDefined();
    const result = res.result as Record<string, unknown>;
    expect(result).toHaveProperty('success', true);
    expect(result).toHaveProperty('id', ticket.id);
  });

  test('vibe_tracker_delete_ticket without ticket_id returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_delete_ticket', {});
    expect(res.error).toBeDefined();
    expect(res.error?.message).toContain('ticket_id is required');
  });

  test('vibe_tracker_delete_ticket on non-existent ticket returns error', async ({ request }) => {
    const res = await mcpCallTool(request, 'vibe_tracker_delete_ticket', {
      ticket_id: 'issue-99999',
    });
    expect(res.error).toBeDefined();
  });
});

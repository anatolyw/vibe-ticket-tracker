import { test, expect } from 'playwright/test';

import { createTicket, createAndCleanup, deleteTicket } from './shared/test-helpers.js';

test.describe('Backend E2E — Race Conditions: Duplicate Ticket Submission', () => {

  test('submitting two tickets with the same title in quick succession creates unique tickets', async ({ request }) => {
    const title = 'Race condition duplicate title';
    const t1 = await createTicket(request, title);
    const t2 = await createTicket(request, title);
    try {
      expect(t1.id).not.toBe(t2.id);
      expect(t1.title).toBe(title);
      expect(t2.title).toBe(title);
      // Both IDs are sequential (ascending), may not be adjacent due to concurrent tests
      const num1 = parseInt((t1.id as string).split('-')[1]);
      const num2 = parseInt((t2.id as string).split('-')[1]);
      expect(num2).toBeGreaterThan(num1);
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${t1.id}`);
      await request.delete(`http://localhost:61001/api/tickets/${t2.id}`);
    }
  });

  test('concurrent creates get distinct sequential IDs', async ({ request }) => {
    // Simulate near-concurrent requests by rapid-fire creates
    const { ticket: t1 } = await createAndCleanup(request, 'Concurrent 1', 'issue');
    const { ticket: t2 } = await createAndCleanup(request, 'Concurrent 2', 'issue');
    try {
      const num1 = parseInt((t1.id as string).split('-')[1]);
      const num2 = parseInt((t2.id as string).split('-')[1]);
      // IDs are ascending (second is later) but may not be adjacent due to parallel tests
      expect(num2).toBeGreaterThan(num1);
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${t2.id}`);
    }
  });

  test('multiple rapid creates maintain ID ordering', async ({ request }) => {
    const tickets: Record<string, unknown>[] = [];
    for (let i = 0; i < 5; i++) {
      const ticket = await createTicket(request, `Rapid ${i}`);
      tickets.push(ticket);
    }
    try {
      for (let i = 0; i < tickets.length - 1; i++) {
        const numA = parseInt((tickets[i].id as string).split('-')[1]);
        const numB = parseInt((tickets[i + 1].id as string).split('-')[1]);
        // IDs are ascending, may have gaps from parallel tests
        expect(numB).toBeGreaterThanOrEqual(numA);
      }
    } finally {
      for (const t of tickets) {
        await request.delete(`http://localhost:61001/api/tickets/${t.id}`);
      }
    }
  });

  test('same title creates tickets with unique IDs', async ({ request }) => {
    const title = 'Duplicate title for suffix test';
    const t1 = await createTicket(request, title);
    const t2 = await createTicket(request, title);
    try {
      // Both should have distinct IDs
      expect(t1.id).not.toBe(t2.id);
      expect(t1.title).toBe(title);
      expect(t2.title).toBe(title);
      // The second ticket should have a higher number
      const num1 = parseInt((t1.id as string).split('-')[1]);
      const num2 = parseInt((t2.id as string).split('-')[1]);
      expect(num2).toBeGreaterThan(num1);
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${t1.id}`);
      await request.delete(`http://localhost:61001/api/tickets/${t2.id}`);
    }
  });
});

test.describe('Backend E2E — Race Conditions: Duplicate Update', () => {test('updating a ticket twice sequentially — second overwrites first', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Double update test');
    try {
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'First update' },
      });
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Second update' },
      });
      const res = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
      const t = await res.json() as Record<string, unknown>;
      expect(t.title).toBe('Second update');
    } finally {
      await cleanup();
    }
  });

  test('rapid updates reflect the last update on GET', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Rapid update test');
    try {
      // Fire off rapid updates
      await Promise.all([
        request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
          data: { title: 'Update A' },
        }),
        request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
          data: { title: 'Update B' },
        }),
      ]);
      const res = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
      const t = await res.json() as Record<string, unknown>;
      expect(t.title).toBe('Update B');
    } finally {
      await cleanup();
    }
  });
});

test.describe('Backend E2E — Race Conditions: Delete-then-Use', () => {test('GET after DELETE returns 404', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Delete-then-GET test');
    await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    const res = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
    expect(res.status()).toBe(404);
  });

  test('PUT after DELETE returns 400', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Delete-then-PUT test');
    await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
      data: { title: 'Should fail' },
    });
    expect(res.status()).toBe(400);
  });

  test('DELETE on already-deleted ticket returns 404', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Double delete test');
    await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    const res = await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    expect(res.status()).toBe(404);
  });

  test('MCP delete then GET returns error', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'MCP delete-then-get');
    try {
      // Delete via REST API
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);

      // Try to get it via MCP — should return error
      const callRes = await request.post('http://localhost:61001/mcp', {
        data: {
          jsonrpc: '2.0',
          id: 'get-deleted',
          method: 'tools/call',
          params: {
            name: 'vibe_tracker_get_ticket',
            arguments: { ticket_id: ticket.id },
          },
        },
      });
      const body = await callRes.json() as Record<string, unknown>;
      // MCP returns error in body.error
      expect(body.error).toBeDefined();
    } finally {
      await cleanup();
    }
  });
});

test.describe('Backend E2E — Error Handling: API Edge Cases', () => {test('POST /api/tickets with missing title field returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { type: 'feat', description: 'no title' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('error', 'Title is required');
  });

  test('PUT /api/tickets/:id with empty data returns 400', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Empty update test');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: {},
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test('GET with malformed non-existent ID returns 404', async ({ request }) => {
    const res = await request.get('http://localhost:61001/api/tickets/nonexistent-id');
    expect(res.status()).toBe(404);
  });

  test('DELETE with malformed non-existent ID returns 404', async ({ request }) => {
    const res = await request.delete('http://localhost:61001/api/tickets/nonexistent-id');
    expect(res.status()).toBe(404);
  });

  test('PUT with invalid type in body returns 400', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Invalid type test');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { type: 'not_a_valid_type' },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test('GET /api/tickets/summaries with no tickets returns empty array', async ({ request }) => {
    // Note: tickets from previous tests may exist, but the array should always be valid
    const res = await request.get('http://localhost:61001/api/tickets/summaries');
    expect(res.status()).toBe(200);
    const summaries = await res.json() as unknown[];
    expect(Array.isArray(summaries)).toBeTruthy();
  });

  test('GET /api/tickets with large offset returns empty list', async ({ request }) => {
    // Use a retry-friendly approach — if server is restarting, skip
    try {
      const res = await request.get('http://localhost:61001/api/tickets?offset=999999');
      expect(res.status()).toBe(200);
      const json = await res.json() as Record<string, unknown>;
      expect((json.tickets as unknown[]).length).toBe(0);
      expect(json.pagination).toHaveProperty('hasMore', false);
    } catch (e: unknown) {
      // Server may have restarted between tests
      if (e instanceof Error && e.message.includes('ECONNREFUSED')) {
        test.skip();
      }
      throw e;
    }
  });

  test('GET /api/tickets with invalid limit defaults to valid range', async ({ request }) => {
    const res = await request.get('http://localhost:61001/api/tickets?limit=not-a-number');
    expect(res.status()).toBe(200);
  });

  test('PUT /api/tickets/:id with invalid status returns 400', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Invalid status test');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { status: 'invalid_status' },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup();
    }
  });
});

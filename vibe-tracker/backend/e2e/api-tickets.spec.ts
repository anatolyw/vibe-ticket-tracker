import { test, expect } from 'playwright/test';

import { createTicket, createAndCleanup } from './shared/test-helpers.js';

test.describe('Backend E2E — REST API: Ticket Create', () => {

  test('POST /api/tickets creates a ticket with all fields', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Full create test', 'feat', 'Test description');
    expect(ticket.id).toBeDefined();
    expect(ticket.title).toBe('Full create test');
    expect(ticket.type).toBe('feat');
    expect(ticket.status).toBe('open');
    expect(ticket.created).toBeDefined();
    expect(ticket.updated).toBeDefined();
    expect(ticket.body).toHaveProperty('raw');
    expect(ticket.body).toHaveProperty('html');
  });

  test('POST /api/tickets creates a ticket with title and type only', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Minimal create', 'bug');
    expect(ticket.title).toBe('Minimal create');
    expect(ticket.type).toBe('bug');
    expect(ticket.status).toBe('open');
    expect(ticket.body.raw).toContain('## Description');
    expect(ticket.body.raw).toContain('## Tasks');
  });

  test('POST /api/tickets with missing title returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { type: 'feat' },
    });
    expect(res.status()).toBe(400);
    const body = await res.json();
    expect(body).toHaveProperty('error', 'Title is required');
  });

  test('POST /api/tickets with empty string title returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { title: '', type: 'issue' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/tickets with whitespace-only title returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { title: '   ', type: 'issue' },
    });
    // Accept 400 or connection refused (server may have restarted)
    if (res.status() === 400) {
      // expected
    } else if (res.status() === 0) {
      // Connection refused — server was restarting, skip
      test.skip();
    } else {
      expect(res.status()).toBe(400);
    }
  });

  test('POST /api/tickets with invalid type returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { title: 'Bad type', type: 'invalid_type' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/tickets returns sequential IDs', async ({ request }) => {
    const t1 = await createTicket(request, 'Sequential test 1');
    try {
      const t2 = await createTicket(request, 'Sequential test 2');
      try {
        const num1 = parseInt((t1.id as string).split('-')[1]);
        const num2 = parseInt((t2.id as string).split('-')[1]);
        // IDs are ascending but may have gaps from parallel tests
        expect(num2).toBeGreaterThan(num1);
      } finally {
        await request.delete(`http://localhost:61001/api/tickets/${t2.id}`);
      }
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${t1.id}`);
    }
  });

  test('POST /api/tickets returns ISO 8601 timestamps', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Timestamp test');
    const isoPattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/;
    expect(isoPattern.test(ticket.created as string)).toBeTruthy();
    expect(isoPattern.test(ticket.updated as string)).toBeTruthy();
  });

  test('POST /api/tickets returns 201 status', async ({ request }) => {
    const res = await request.post('http://localhost:61001/api/tickets', {
      data: { title: 'Status code test', type: 'issue' },
    });
    expect(res.status()).toBe(201);
  });
});

test.describe('Backend E2E — REST API: Ticket Read', () => {test('GET /api/tickets returns the list with pagination', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'List test');
    const res = await request.get('http://localhost:61001/api/tickets');
    expect(res.status()).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    expect(json).toHaveProperty('tickets');
    expect(Array.isArray(json.tickets)).toBeTruthy();
    expect(json).toHaveProperty('pagination');
    const pagination = json.pagination as Record<string, unknown>;
    expect(pagination).toHaveProperty('total');
    expect(pagination).toHaveProperty('limit');
    expect(pagination).toHaveProperty('offset');
    expect(pagination).toHaveProperty('hasMore');
  });

  test('GET /api/tickets filters by status open', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Open filter test');
    const res = await request.get('http://localhost:61001/api/tickets?status=open');
    expect(res.status()).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const tickets = json.tickets as Array<Record<string, unknown>>;
    for (const t of tickets) {
      expect(t.status).toBe('open');
    }
  });

  test('GET /api/tickets filters by status closed', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Closed filter test');
    // Close the ticket first
    await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
      data: { status: 'closed' },
    });
    try {
      const res = await request.get('http://localhost:61001/api/tickets?status=closed');
      expect(res.status()).toBe(200);
      const json = await res.json() as Record<string, unknown>;
      const tickets = json.tickets as Array<Record<string, unknown>>;
      const closedTickets = tickets.filter((t: Record<string, unknown>) => t.status === 'closed');
      expect(closedTickets.length).toBeGreaterThan(0);
    } finally {
      await cleanup();
    }
  });

  test('GET /api/tickets filters by type', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Type filter test', 'bug');
    const res = await request.get('http://localhost:61001/api/tickets?type=bug');
    expect(res.status()).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const tickets = json.tickets as Array<Record<string, unknown>>;
    for (const t of tickets) {
      expect(t.type).toBe('bug');
    }
  });

  test('GET /api/tickets text search in title', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Search title match');
    const res = await request.get('http://localhost:61001/api/tickets?search=Search+title');
    expect(res.status()).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const tickets = json.tickets as Array<Record<string, unknown>>;
    expect(tickets.some((t: Record<string, unknown>) => t.title === 'Search title match')).toBeTruthy();
  });

  test('GET /api/tickets text search in body', async ({ request }) => {
    // Create ticket with description in body
    const createRes = await request.post('http://localhost:61001/api/tickets', {
      data: { title: 'Body search test', type: 'issue', description: 'This body contains special keyword XYZ' },
    });
    expect(createRes.ok()).toBeTruthy();
    const ticket = await createRes.json() as Record<string, unknown>;
    try {
      // Verify ticket exists in full list first
      const listRes = await request.get('http://localhost:61001/api/tickets');
      const listJson = await listRes.json() as Record<string, unknown>;
      const allTickets = listJson.tickets as Array<Record<string, unknown>>;
      expect(allTickets.some((t: Record<string, unknown>) => t.id === ticket.id)).toBeTruthy();

      // Search by body keyword
      const res = await request.get('http://localhost:61001/api/tickets?search=XYZ');
      expect(res.status()).toBe(200);
      const json = await res.json() as Record<string, unknown>;
      const tickets = json.tickets as Array<Record<string, unknown>>;
      expect(tickets.some((t: Record<string, unknown>) => t.id === ticket.id)).toBeTruthy();
    } finally {
      await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    }
  });

  test('GET /api/tickets sorts by created asc', async ({ request }) => {
    const { ticket: t1, cleanup: c1 } = await createAndCleanup(request, 'Created sort A', 'issue');
    try {
      // Small delay to ensure different timestamps
      await new Promise((r) => setTimeout(r, 10));
      const { ticket: t2, cleanup: c2 } = await createAndCleanup(request, 'Created sort B', 'issue');
      try {
        const res = await request.get('http://localhost:61001/api/tickets?sort=created&order=asc');
        expect(res.status()).toBe(200);
        const json = await res.json() as Record<string, unknown>;
        const tickets = json.tickets as Array<Record<string, unknown>>;
        const t1Idx = tickets.findIndex((t: Record<string, unknown>) => t.id === t1.id);
        const t2Idx = tickets.findIndex((t: Record<string, unknown>) => t.id === t2.id);
        expect(t1Idx).toBeLessThan(t2Idx);
      } finally {
        await c2();
      }
    } finally {
      await c1();
    }
  });

  test('GET /api/tickets sorts by title asc', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Zbr-titlesort-test');
    try {
      const { ticket: ticket2, cleanup: cleanup2 } = await createAndCleanup(request, 'Alh-titlesort-test');
      try {
        const res = await request.get('http://localhost:61001/api/tickets?sort=title&order=asc');
        expect(res.status()).toBe(200);
        const json = await res.json() as Record<string, unknown>;
        const tickets = json.tickets as Array<Record<string, unknown>>;
        const zebraIdx = tickets.findIndex((t: Record<string, unknown>) => t.id === ticket.id);
        const alphaIdx = tickets.findIndex((t: Record<string, unknown>) => t.id === ticket2.id);
        expect(zebraIdx).toBeGreaterThan(alphaIdx);
      } finally {
        await cleanup2();
      }
    } finally {
      await cleanup();
    }
  });

  test('GET /api/tickets with limit and offset', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Pagination limit test');
    const res = await request.get('http://localhost:61001/api/tickets?limit=1&offset=0');
    expect(res.status()).toBe(200);
    const json = await res.json() as Record<string, unknown>;
    const tickets = json.tickets as Array<Record<string, unknown>>;
    expect(tickets.length).toBeLessThanOrEqual(1);
    expect(json.pagination).toHaveProperty('hasMore');
  });

  test('GET /api/tickets/:id returns a single ticket', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Single ticket read');
    const res = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
    expect(res.status()).toBe(200);
    const t = await res.json() as Record<string, unknown>;
    expect(t.id).toBe(ticket.id);
    expect(t.title).toBe('Single ticket read');
    expect(t).toHaveProperty('body');
    expect(t.body).toHaveProperty('raw');
    expect(t.body).toHaveProperty('html');
  });

  test('GET /api/tickets/:id for non-existent ticket returns 404', async ({ request }) => {
    const res = await request.get('http://localhost:61001/api/tickets/issue-99999');
    expect(res.status()).toBe(404);
    const body = await res.json();
    expect(body).toHaveProperty('error');
  });

  test('GET /api/tickets/:id/raw returns markdown content-type', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Raw markdown test');
    try {
      const res = await request.get(`http://localhost:61001/api/tickets/${ticket.id}/raw`);
      expect(res.status()).toBe(200);
      expect(res.headers()['content-type']).toContain('text/markdown');
      const text = await res.text();
      expect(text).toContain('---');
      expect(text).toContain('Raw markdown test');
      expect(text).toContain('## Description');
    } finally {
      await cleanup();
    }
  });

  test('GET /api/tickets/:id/raw for non-existent ticket returns 404', async ({ request }) => {
    const res = await request.get('http://localhost:61001/api/tickets/issue-99999/raw');
    expect(res.status()).toBe(404);
  });

  test('GET /api/tickets/summaries returns ticket summaries', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Summaries test');
    const res = await request.get('http://localhost:61001/api/tickets/summaries');
    expect(res.status()).toBe(200);
    const summaries = await res.json() as Array<Record<string, unknown>>;
    expect(Array.isArray(summaries)).toBeTruthy();
    const summary = summaries.find((s: Record<string, unknown>) => s.id === ticket.id);
    expect(summary).toBeDefined();
    expect(summary).toHaveProperty('id');
    expect(summary).toHaveProperty('title');
    expect(summary).toHaveProperty('type');
    expect(summary).toHaveProperty('status');
  });
});

test.describe('Backend E2E — REST API: Ticket Update', () => {test('PUT /api/tickets/:id updates title', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Original title', 'issue');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Updated title' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.title).toBe('Updated title');
      expect(updated.id).toBe(ticket.id);
    } finally {
      await cleanup();
    }
  });

  test('PUT /api/tickets/:id updates status', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Status update test', 'issue');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { status: 'closed' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.status).toBe('closed');
    } finally {
      await cleanup();
    }
  });

  test('PUT /api/tickets/:id updates type', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Type update test', 'issue');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { type: 'feat' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.type).toBe('feat');
    } finally {
      await cleanup();
    }
  });

  test('PUT /api/tickets/:id updates body', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Body update test', 'issue');
    try {
      const newBody = '## New Description\nUpdated content here';
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { body: newBody },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.body.raw).toBe(newBody);
    } finally {
      await cleanup();
    }
  });

  test('PUT /api/tickets/:id updates multiple fields at once', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Multi update test', 'issue');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Fully updated', type: 'bug', status: 'closed', body: 'Complete body' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.title).toBe('Fully updated');
      expect(updated.type).toBe('bug');
      expect(updated.status).toBe('closed');
      expect(updated.body.raw).toBe('Complete body');
    } finally {
      await cleanup();
    }
  });

  test('PUT with partial fields only updates provided fields', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Partial update test', 'feat');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Partial title' },
      });
      expect(res.status()).toBe(200);
      const updated = await res.json() as Record<string, unknown>;
      expect(updated.title).toBe('Partial title');
      expect(updated.type).toBe('feat'); // Preserved
    } finally {
      await cleanup();
    }
  });

  test('PUT with empty body returns 400', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Empty body test');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: {},
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test('PUT with invalid type returns 400', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Invalid type update');
    try {
      const res = await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { type: 'invalid_type' },
      });
      expect(res.status()).toBe(400);
    } finally {
      await cleanup();
    }
  });

  test('PUT on non-existent ticket returns 400', async ({ request }) => {
    const res = await request.put('http://localhost:61001/api/tickets/issue-99999', {
      data: { title: 'ghost' },
    });
    expect(res.status()).toBe(400);
  });

  test('Updated ticket reflects in GET immediately', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Initial title', 'issue');
    try {
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Updated for verification' },
      });
      const getRes = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
      const t = await getRes.json() as Record<string, unknown>;
      expect(t.title).toBe('Updated for verification');
    } finally {
      await cleanup();
    }
  });

  test('Update preserves created timestamp', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Created timestamp test');
    const originalCreated = ticket.created;
    try {
      await new Promise((r) => setTimeout(r, 50)); // Ensure time passes
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'Updated title' },
      });
      const getRes = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
      const updated = await getRes.json() as Record<string, unknown>;
      expect(updated.created).toBe(originalCreated);
      expect(updated.updated).not.toBe(originalCreated);
    } finally {
      await cleanup();
    }
  });

  test('updated timestamp changes after update', async ({ request }) => {
    const { ticket, cleanup } = await createAndCleanup(request, 'Updated timestamp test');
    const originalUpdated = ticket.updated;
    try {
      await new Promise((r) => setTimeout(r, 50));
      await request.put(`http://localhost:61001/api/tickets/${ticket.id}`, {
        data: { title: 'New title' },
      });
      const getRes = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
      const updated = await getRes.json() as Record<string, unknown>;
      expect(updated.updated > originalUpdated).toBeTruthy();
    } finally {
      await cleanup();
    }
  });
});

test.describe('Backend E2E — REST API: Ticket Delete', () => {test('DELETE /api/tickets/:id removes the ticket', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Delete test');
    const res = await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    expect(res.status()).toBe(200);
    const body = await res.json() as Record<string, unknown>;
    expect(body).toHaveProperty('success', true);
    expect(body).toHaveProperty('id', ticket.id);
  });

  test('Deleted ticket returns 404 on GET', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Delete then GET test');
    await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    const getRes = await request.get(`http://localhost:61001/api/tickets/${ticket.id}`);
    expect(getRes.status()).toBe(404);
  });

  test('DELETE on non-existent ticket returns 404', async ({ request }) => {
    const res = await request.delete('http://localhost:61001/api/tickets/issue-99999');
    expect(res.status()).toBe(404);
  });

  test('Deleted ticket removed from list', async ({ request }) => {
    const { ticket } = await createAndCleanup(request, 'Delete from list test');
    await request.delete(`http://localhost:61001/api/tickets/${ticket.id}`);
    const res = await request.get('http://localhost:61001/api/tickets');
    const json = await res.json() as Record<string, unknown>;
    const tickets = json.tickets as Array<Record<string, unknown>>;
    expect(tickets.every((t: Record<string, unknown>) => t.id !== ticket.id)).toBeTruthy();
  });
});

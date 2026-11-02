import { test, expect } from 'playwright/test';

test.describe('Ticket API - Create', () => {
  test('POST /api/tickets creates a new ticket', async ({ request }) => {
    const res = await request.post('http://localhost:61000/api/tickets', {
      data: {
        title: 'Test from Playwright',
        type: 'issue',
        description: 'Created by automated test',
      },
    });
    expect(res.ok()).toBeTruthy();
    const created = await res.json();
    expect(created).toHaveProperty('id');
    expect(created.title).toBe('Test from Playwright');
    expect(created.type).toBe('issue');
    expect(created.status).toBe('open');
    await request.delete(`http://localhost:61000/api/tickets/${created.id}`);
  });

  test('POST /api/tickets validates required fields', async ({ request }) => {
    const res = await request.post('http://localhost:61000/api/tickets', {
      data: { type: 'feat' },
    });
    expect(res.status()).toBe(400);
  });

  test('POST /api/tickets with missing title returns 400', async ({ request }) => {
    const res = await request.post('http://localhost:61000/api/tickets', {
      data: { type: 'feat', description: 'no title' },
    });
    expect(res.status()).toBe(400);
  });
});

test.describe('Ticket API - Read', () => {
  test('GET /api/tickets returns the list with pagination', async ({ request }) => {
    const res = await request.get('http://localhost:61000/api/tickets');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('tickets');
    expect(Array.isArray(json.tickets)).toBeTruthy();
    expect(json).toHaveProperty('pagination');
    expect(json.pagination).toHaveProperty('total');
    expect(json.pagination).toHaveProperty('hasMore');
  });

  test('GET /api/tickets/:id returns a single ticket', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Read test', type: 'feat' },
    });
    const ticket = await createRes.json();
    try {
      const getRes = await request.get(`http://localhost:61000/api/tickets/${ticket.id}`);
      expect(getRes.ok()).toBeTruthy();
      const t = await getRes.json();
      expect(t.id).toBe(ticket.id);
      expect(t).toHaveProperty('body');
      expect(t.body).toHaveProperty('raw');
      expect(t.body).toHaveProperty('html');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('GET /api/tickets/:id for non-existent ticket returns 404', async ({ request }) => {
    const res = await request.get('http://localhost:61000/api/tickets/issue-99999');
    expect(res.status()).toBe(404);
  });
});

test.describe('Ticket API - Update', () => {
  test('PUT /api/tickets/:id updates title', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Original', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { title: 'Updated title' },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.title).toBe('Updated title');
      expect(updated.id).toBe(ticket.id);
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT /api/tickets/:id updates status', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Status test', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { status: 'closed' },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.status).toBe('closed');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT /api/tickets/:id updates type', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Type test', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { type: 'feat' },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.type).toBe('feat');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT /api/tickets/:id updates body', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Body test', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const newBody = '## New Description\nUpdated content';
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { body: newBody },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.body.raw).toBe(newBody);
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT /api/tickets/:id updates multiple fields at once', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Multi', type: 'issue', status: 'open' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { title: 'Fully updated', type: 'issue', status: 'closed', body: 'Complete' },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.title).toBe('Fully updated');
      expect(updated.type).toBe('issue');
      expect(updated.status).toBe('closed');
      expect(updated.body.raw).toBe('Complete');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT with partial fields only updates provided fields', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Partial', type: 'feat' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { title: 'Partial update' },
      });
      expect(res.ok()).toBeTruthy();
      const updated = await res.json();
      expect(updated.title).toBe('Partial update');
      expect(updated.type).toBe('feat');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT with empty body returns 400', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Empty test', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: {},
      });
      expect(res.status()).toBe(400);
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });

  test('PUT on non-existent ticket returns 400', async ({ request }) => {
    const res = await request.put('http://localhost:61000/api/tickets/issue-99999', {
      data: { title: 'ghost' },
    });
    expect(res.status()).toBe(400);
  });

  test('update reflects in GET response immediately', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Initial', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      await request.put(`http://localhost:61000/api/tickets/${ticket.id}`, {
        data: { title: 'Updated for verification' },
      });
      const getRes = await request.get(`http://localhost:61000/api/tickets/${ticket.id}`);
      const t = await getRes.json();
      expect(t.title).toBe('Updated for verification');
    } finally {
      await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
    }
  });
});

test.describe('Ticket API - Delete', () => {
  test('DELETE /api/tickets/:id removes the ticket', async ({ request }) => {
    const createRes = await request.post('http://localhost:61000/api/tickets', {
      data: { title: 'Delete test', type: 'issue' },
    });
    const ticket = await createRes.json();
    try {
      const res = await request.delete(`http://localhost:61000/api/tickets/${ticket.id}`);
      expect(res.ok()).toBeTruthy();
      const result = await res.json();
      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('id', ticket.id);

      const getRes = await request.get(`http://localhost:61000/api/tickets/${ticket.id}`);
      expect(getRes.status()).toBe(404);
    } finally {
      // Already deleted
    }
  });

  test('DELETE on non-existent ticket returns 404', async ({ request }) => {
    const res = await request.delete('http://localhost:61000/api/tickets/issue-99999');
    expect(res.status()).toBe(404);
  });
});

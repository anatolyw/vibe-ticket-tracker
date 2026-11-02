import { APIRequestContext } from 'playwright';

function getTestPort(): number {
  return (globalThis as Record<string, unknown>).__E2E_PORT as number ?? 61001;
}

const BASE_URL = `http://localhost:${getTestPort()}`;

/**
 * Create a new ticket via the REST API.
 * @param request — Playwright APIRequestContext
 * @param title — Ticket title (defaults to "e2e-test-{timestamp}")
 * @param type — Ticket type (defaults to "issue")
 * @param description — Ticket description (defaults to "")
 */
export async function createTicket(
  request: APIRequestContext,
  title?: string,
  type?: string,
  description?: string,
): Promise<Record<string, unknown>> {
  const res = await request.post(`${BASE_URL}/api/tickets`, {
    data: {
      title: title ?? `e2e-test-${Date.now()}`,
      type: type ?? 'issue',
      description: description ?? '',
    },
  });
  if (!res.ok()) {
    const body = await res.json().catch(() => ({}));
    throw new Error(`Failed to create ticket: ${res.status()} ${JSON.stringify(body)}`);
  }
  return res.json() as Promise<Record<string, unknown>>;
}

/**
 * Delete a ticket by ID. Idempotent — silently ignores 404s.
 * @param request — Playwright APIRequestContext
 * @param ticketId — Ticket ID to delete
 */
export async function deleteTicket(request: APIRequestContext, ticketId: string): Promise<void> {
  try {
    const res = await request.delete(`${BASE_URL}/api/tickets/${ticketId}`);
    if (!res.ok() && res.status() !== 404) {
      const body = await res.json().catch(() => ({}));
      throw new Error(`Failed to delete ticket: ${res.status()} ${JSON.stringify(body)}`);
    }
  } catch (e) {
    if (e instanceof Error && e.message.includes('404')) return;
    throw e;
  }
}

/**
 * Create a ticket and return a cleanup function.
 * Ensures tickets are always cleaned up after tests, even if they fail.
 * @param request — Playwright APIRequestContext
 * @param title — Optional ticket title
 * @param type — Optional ticket type
 */
export async function createAndCleanup(
  request: APIRequestContext,
  title?: string,
  type?: string,
): Promise<{ ticket: Record<string, unknown>; cleanup: () => Promise<void> }> {
  const ticket = await createTicket(request, title, type);
  return {
    ticket,
    cleanup: async () => {
      try {
        await deleteTicket(request, ticket.id as string);
      } catch {
        // Silently ignore cleanup failures
      }
    },
  };
}

import { test, expect } from 'playwright/test';

async function createTestTicket(request: any, overrides: Record<string, string> = {}) {
  const res = await request.post('http://localhost:61000/api/tickets', {
    data: { title: 'E2E test ticket', type: 'bug', description: 'Auto-created by Playwright test', ...overrides },
  });
  if (!res.ok()) throw new Error(`Failed to create test ticket: ${res.status()}`);
  return (await res.json()).id;
}

async function deleteTicket(request: any, id: string) {
  try { await request.delete(`http://localhost:61000/api/tickets/${id}`); } catch { /* ignore */ }
}

let testTickets: string[] = [];

test.beforeEach(async ({ page, request }) => {
  testTickets = [
    await createTestTicket(request, { title: 'E2E search test ticket A', type: 'bug' }),
    await createTestTicket(request, { title: 'E2E search test ticket B', type: 'feat' }),
    await createTestTicket(request, { title: 'Another E2E ticket', type: 'issue', status: 'closed' }),
  ];
  await page.goto('/tickets');
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }) => {
  for (const id of testTickets) { await deleteTicket(request, id); }
});

test.describe('Ticket List - Search', () => {
  test('search filters by ticket title', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search tickets..."]');
    await searchInput.fill('E2E search test ticket A');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText('E2E search test ticket A');
  });

  test('search with no match shows empty state', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search tickets..."]');
    await searchInput.fill('zzzznonexistentzzzz');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText('No tickets found');
    await expect(page.locator('body')).toContainText('Try adjusting your filters');
  });

  test('clearing search shows all tickets again', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search tickets..."]');
    await searchInput.fill('test');
    await page.waitForTimeout(300);
    await searchInput.clear();
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    expect(await items.count()).toBeGreaterThan(0);
  });
});

test.describe('Ticket List - Type Filter', () => {
  test('type filter filters by type', async ({ page }) => {
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('bug');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('resetting type filter to "All Types" shows all', async ({ page }) => {
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('bug');
    await page.waitForTimeout(300);
    await typeSelect.selectOption('');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    expect(await items.count()).toBeGreaterThan(0);
  });
});

test.describe('Ticket List - Status Filter', () => {
  test('status filter filters by status', async ({ page }) => {
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('closed');
    await page.waitForTimeout(300);
    await expect(page.locator('body')).toContainText('closed');
  });

  test('resetting status filter to "All Status" shows all', async ({ page }) => {
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('closed');
    await page.waitForTimeout(300);
    await statusSelect.selectOption('');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    expect(await items.count()).toBeGreaterThan(0);
  });
});

test.describe('Ticket List - Sort', () => {
  test('sort by title ascending works', async ({ page }) => {
    const sortSelect = page.locator('select').nth(2);
    await sortSelect.selectOption('title-asc');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });

  test('sort by title descending works', async ({ page }) => {
    const sortSelect = page.locator('select').nth(2);
    await sortSelect.selectOption('title-desc');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Ticket List - Combined Filters', () => {
  test('search and type filter work together', async ({ page }) => {
    const searchInput = page.locator('input[placeholder="Search tickets..."]');
    await searchInput.fill('test');
    const typeSelect = page.locator('select').first();
    await typeSelect.selectOption('bug');
    await page.waitForTimeout(300);
    const items = page.locator('a[href^="/tickets/"]');
    const count = await items.count();
    expect(count).toBeGreaterThan(0);
  });
});

test.describe('Ticket List - Navigation', () => {
  test('clicking a ticket navigates to detail page', async ({ page }) => {
    const firstTicket = page.locator('a[href^="/tickets/issue-"]').first();
    await expect(firstTicket).toBeVisible();
    await firstTicket.click();
    await page.waitForURL('**/tickets/issue-**');
    await expect(page.getByRole('heading')).toBeVisible();
  });

  test('"New Ticket" button navigates to create page from tickets list', async ({ page }) => {
    // The "New Ticket" button is in the page header area next to the title
    // Use the button in the page header (the one with primary bg)
    const newTicketBtn = page.locator('a:has-text("New Ticket")').first();
    await newTicketBtn.click();
    await page.waitForURL('**/tickets/new');
    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible();
  });

  test('shows "Showing X tickets" count', async ({ page }) => {
    await expect(page.locator('span:has-text("Showing ")')).toBeVisible();
  });
});

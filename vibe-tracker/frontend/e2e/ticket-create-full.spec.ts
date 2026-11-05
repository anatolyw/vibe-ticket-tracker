import { test, expect } from 'playwright/test';

test.describe('Ticket Create - Full Flow', () => {
  test('complete ticket creation flow from form to API response', async ({ page }) => {
    // Track API calls
    const apiCalls: Array<{ method: string; url: string; status?: number; body?: string }> = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/tickets')) {
        apiCalls.push({
          method: req.method(),
          url: req.url(),
          body: req.postData() || undefined,
        });
      }
    });
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/tickets') && resp.status() >= 400) {
        const entry = apiCalls.find(c => c.url === resp.url() && c.method === resp.request().method());
        if (entry) {
          entry.status = resp.status();
          try {
            entry.body = await resp.text();
          } catch { /* ignore */ }
        }
      }
    });

    // Navigate to create page
    await page.goto('/tickets/new', { waitUntil: 'networkidle' });
    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible();

    // Verify ticket types dropdown is populated
    const typeSelect = page.locator('select');
    await expect(typeSelect).toBeVisible();
    const options = await typeSelect.evaluate(
      (sel: HTMLSelectElement) => Array.from(sel.options).map(o => o.value)
    );
    expect(options).toContain('issue');
    expect(options).toContain('feat');
    expect(options).toContain('bug');
    expect(options).toContain('epic');
    // Default type should be the first one
    await expect(typeSelect).toHaveValue('issue');

    // Fill in the title
    const titleInput = page.locator('input[type="text"]');
    await titleInput.fill('E2E Test Ticket Full Flow');
    await expect(titleInput).toHaveValue('E2E Test Ticket Full Flow');

    // Verify character counter updates
    const counter = page.locator('span.text-xs.text-muted-foreground');
    await expect(counter).toContainText('/200');

    // Fill in description (textarea uses [value] binding, need to dispatch input to update signal)
    const textarea = page.locator('textarea');
    const descText = '# Test Description\n\nThis is a test ticket created via E2E.\n\n## Steps\n1. Fill form\n2. Submit\n3. Verify';
    await textarea.evaluate((ta, text) => {
      (ta as HTMLTextAreaElement).value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, descText);
    await expect(textarea).toHaveValue(/Test Description/);

    // Click the submit button
    const submitBtn = page.locator('button[type="submit"]');
    await expect(submitBtn).toContainText('Create Ticket');
    await expect(submitBtn).toBeEnabled();
    await submitBtn.click();

    // Verify loading state appears
    await expect(submitBtn).toContainText('Creating...');
    await expect(submitBtn).toBeDisabled();

    // Wait for API call to complete and redirect
    // Give it time for the API call + 1s redirect delay
    await page.waitForTimeout(3000);

    // Verify API POST was made
    const postCalls = apiCalls.filter(c => c.method === 'POST');
    expect(postCalls.length).toBeGreaterThan(0);

    // Verify the POST body contains our data
    const postBody = JSON.parse(postCalls[0].body || '{}');
    expect(postBody.title).toBe('E2E Test Ticket Full Flow');
    expect(postBody.type).toBe('issue');
    expect(postBody.description).toContain('# Test Description');

    // Verify redirect to the ticket detail page and ticket was created correctly
    expect(page.url()).toMatch(/\/tickets\/issue-\d{5}/);

    // Verify the ticket detail page has correct info
    const ticketTitle = page.getByRole('heading', { name: 'E2E Test Ticket Full Flow' });
    await expect(ticketTitle).toBeVisible();

    // Verify type and status badges
    const typeBadge = page.locator('span.px-2\\.5').first();
    await expect(typeBadge).toContainText('issue');
    const statusBadge = page.locator('span.px-2\\.5').nth(1);
    await expect(statusBadge).toContainText('open');

    // Verify description content is rendered
    await expect(page.getByRole('heading', { name: 'Description', exact: true })).toBeVisible();
    await expect(page.getByText('This is a test ticket created via E2E.')).toBeVisible();

    // Verify the ticket was actually persisted via API
    const ticketId = page.url().split('/tickets/')[1];
    const resp = await page.goto(`/api/tickets/${ticketId}`);
    expect(resp?.status()).toBe(200);
    const ticketData = await resp!.json() as Record<string, unknown>;
    expect(ticketData.title).toBe('E2E Test Ticket Full Flow');
    expect(ticketData.type).toBe('issue');
    expect(ticketData.status).toBe('open');
  });

  test('validation: empty title shows error', async ({ page }) => {
    await page.goto('/tickets/new', { waitUntil: 'networkidle' });

    // Don't fill title - try to submit with empty
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Stay on the same page (no redirect)
    await expect(page.locator('h1:has-text("New Ticket")')).toBeVisible();
    // Should show error
    await expect(page.locator('[class*="destructive"]')).toContainText('Title is required');
  });

  test('validation: whitespace-only title shows error', async ({ page }) => {
    await page.goto('/tickets/new', { waitUntil: 'networkidle' });

    // Fill with spaces only
    await page.locator('input[type="text"]').fill('   ');
    const submitBtn = page.locator('button[type="submit"]');
    await submitBtn.click();

    // Stay on the same page
    await expect(page.locator('h1:has-text("New Ticket")')).toBeVisible();
    await expect(page.locator('[class*="destructive"]')).toContainText('Title is required');
  });

  test('cancel button navigates back without creating', async ({ page }) => {
    await page.goto('/tickets/new', { waitUntil: 'networkidle' });

    // Fill some data
    await page.locator('input[type="text"]').fill('Should not create this');
    await page.locator('textarea').fill('Should not save this');

    // Click cancel
    await page.getByRole('link', { name: 'Cancel' }).click();

    // Should be on tickets list
    await page.waitForURL('**/tickets');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
    // The title we typed should NOT appear in the list
    await expect(page.locator('body')).not.toContainText('Should not create this');
  });

  test('create with epic type works', async ({ page }) => {
    // Track API calls
    const apiCalls: Array<{ method: string; url: string; status?: number; body?: string }> = [];
    page.on('request', (req) => {
      if (req.url().includes('/api/tickets')) {
        apiCalls.push({
          method: req.method(),
          url: req.url(),
          body: req.postData() || undefined,
        });
      }
    });
    page.on('response', async (resp) => {
      if (resp.url().includes('/api/tickets') && resp.status() >= 400) {
        const entry = apiCalls.find(c => c.url === resp.url() && c.method === resp.request().method());
        if (entry) {
          entry.status = resp.status();
          try {
            entry.body = await resp.text();
          } catch { /* ignore */ }
        }
      }
    });

    await page.goto('/tickets/new', { waitUntil: 'networkidle' });

    // Select epic type
    const typeSelect = page.locator('select');
    await typeSelect.selectOption('epic');
    await expect(typeSelect).toHaveValue('epic');

    // Fill in data (textarea needs input event dispatch for [value] binding)
    await page.locator('input[type="text"]').fill('E2E Epic Test');
    await page.locator('textarea').evaluate((ta, text) => {
      (ta as HTMLTextAreaElement).value = text;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }, 'An epic description');

    // Submit
    await page.locator('button[type="submit"]').click();
    await page.waitForTimeout(3000);

    // Verify API call had epic type
    const postCalls = apiCalls.filter(c => c.method === 'POST');
    const postBody = JSON.parse(postCalls[0].body || '{}');
    expect(postBody.type).toBe('epic');

    // Verify redirect to detail page
    expect(page.url()).toMatch(/\/tickets\/issue-\d{5}/);

    // Verify epic type badge on detail page (case-insensitive)
    const typeBadge = page.locator('span.px-2\\.5').first();
    await expect(typeBadge).toContainText('epic');

    // Verify the ticket was actually created by fetching via API
    const ticketId = page.url().split('/tickets/')[1];
    const response = await page.goto(`/api/tickets/${ticketId}`);
    expect(response?.status()).toBe(200);
    const ticketData = await response!.json();
    expect(ticketData.title).toBe('E2E Epic Test');
    expect(ticketData.type).toBe('epic');
    expect(ticketData.status).toBe('open');
  });
});

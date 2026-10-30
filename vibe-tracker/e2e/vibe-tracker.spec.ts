import { test, expect } from 'playwright/test';

const BASE = 'http://localhost:61000';
const LARGE_VIEWPORT = { width: 1280, height: 800 };

function getLabelTexts(page) {
  return page.locator('app-sidebar nav a').evaluateAll(links =>
    links.map(a => a.querySelector('span.truncate')?.textContent?.trim() ?? '')
  );
}

function getSidebarWidth(page) {
  return page.locator('app-sidebar aside').evaluate(el => el.getBoundingClientRect().width);
}

function getSidebarClass(page) {
  return page.locator('app-sidebar aside').getAttribute('class');
}

test.describe('Vibe Tracker - Sidebar Collapse/Expand', () => {

  test('large screen: sidebar starts expanded with icon + text', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Sidebar should be visible
    const sidebar = page.locator('app-sidebar aside');
    await expect(sidebar).toBeVisible();

    // All nav items should show their text labels (expanded state)
    const labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);
  });

  test('large screen: clicking collapse button minimizes sidebar to icons only', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Verify sidebar is expanded initially - text labels visible
    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);

    // Click the collapse button
    const collapseBtn = page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();
    await page.waitForTimeout(200);

    // After collapse, text labels should be hidden
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);

    // The icons should still be visible
    const dashboardLink = page.locator('app-sidebar nav a').first();
    await expect(dashboardLink.locator('lucide-icon')).toBeVisible();

    // Button aria-label should now be "Expand sidebar"
    const expandBtn = page.locator('app-sidebar aside button[aria-label="Expand sidebar"]');
    await expect(expandBtn).toBeVisible();

    // Sidebar should have the collapsed CSS class
    const sidebarClass = await getSidebarClass(page);
    expect(sidebarClass).toContain('md:w-16');
    expect(sidebarClass).not.toContain('md:w-64');
  });

  test('large screen: clicking expand button restores full sidebar with text', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Collapse the sidebar first
    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);

    // Verify collapsed state - no text labels
    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    // Click expand
    const expandBtn = page.locator('app-sidebar aside button[aria-label="Expand sidebar"]');
    await expandBtn.click();
    await page.waitForTimeout(200);

    // Text labels should be visible again
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);

    // Sidebar should have the expanded CSS class
    const sidebarClass = await getSidebarClass(page);
    expect(sidebarClass).toContain('md:w-64');
  });

  test('large screen: multiple collapse/expand toggles work correctly', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Collapse
    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);
    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    // Expand
    await page.locator('app-sidebar aside button[aria-label="Expand sidebar"]').click();
    await page.waitForTimeout(200);
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);
    await expect(page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]')).toBeVisible();

    // Collapse again
    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    // Expand again
    await page.locator('app-sidebar aside button[aria-label="Expand sidebar"]').click();
    await page.waitForTimeout(200);
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);
    await expect(page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]')).toBeVisible();
  });

  test('large screen: collapsed sidebar uses narrower CSS class', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('app-sidebar aside');

    // Initially expanded - should have md:w-64
    let classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-64');

    // Collapse
    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);

    // Should now have md:w-16
    classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-16');
    expect(classes).not.toContain('md:w-64');

    // Expand
    await page.locator('app-sidebar aside button[aria-label="Expand sidebar"]').click();
    await page.waitForTimeout(200);

    // Back to md:w-64
    classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-64');
    expect(classes).not.toContain('md:w-16');
  });

  test('large screen: collapse/expand icon reflects sidebar state', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    const button = page.locator('app-sidebar aside button');
    const svg = button.locator('svg');

    // Helper: check which icon variant is active by looking at path direction
    // ChevronsLeft paths have `mX Y-5-5 5-5` (left-pointing chevrons)
    // ChevronsRight paths have `mX Y 5 5-5 5` (right-pointing chevrons)
    const getChevronDirection = async () => {
      const svgContent = await svg.innerHTML();
      // If it has left-pointing chevrons (m...-5-5...) return 'left'
      if (svgContent.includes('-5-5')) return 'left';
      // If it has right-pointing chevrons (m... 5 5...) return 'right'
      if (svgContent.includes(' 5 5')) return 'right';
      return 'unknown';
    };

    // Initially expanded: icon should point left (ChevronsLeft)
    expect(await getChevronDirection()).toBe('left');

    // Click collapse
    await button.click();
    await page.waitForTimeout(200);

    // Now collapsed: icon should point right (ChevronsRight)
    expect(await getChevronDirection()).toBe('right');

    // Click expand
    await button.click();
    await page.waitForTimeout(200);

    // Back to expanded: icon should point left again
    expect(await getChevronDirection()).toBe('left');

    // Click collapse again
    await button.click();
    await page.waitForTimeout(200);

    // Collapsed: points right
    expect(await getChevronDirection()).toBe('right');
  });

  test('large screen: localStorage persists collapse state', async ({ page }) => {
    await page.setViewportSize(LARGE_VIEWPORT);
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Collapse the sidebar
    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);
    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    // Navigate away and back
    await page.goto(BASE + '/tickets');
    await page.waitForLoadState('networkidle');

    // Sidebar should remain collapsed (text labels hidden)
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);

    // Go back to root
    await page.goto(BASE);
    await page.waitForLoadState('networkidle');

    // Should still be collapsed
    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();
  });
});

test.describe('Vibe Tracker - Update Ticket API', () => {

  let testTicketId = '';

  test.beforeEach(async ({ request }) => {
    const res = await request.post(BASE + '/api/tickets', {
      data: {
        title: 'Playwright update test ticket',
        type: 'bug',
        description: 'Test body for update testing',
      },
    });
    expect(res.ok()).toBeTruthy();
    const ticket = await res.json();
    testTicketId = ticket.id;
  });

  test.afterEach(async ({ request }) => {
    if (testTicketId) {
      await request.delete(BASE + `/api/tickets/${testTicketId}`);
    }
  });

  test('update ticket title via API', async ({ request }) => {
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: { title: 'Updated title' },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.title).toBe('Updated title');
    expect(updated.id).toBe(testTicketId);
  });

  test('update ticket status via API', async ({ request }) => {
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: { status: 'closed' },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.status).toBe('closed');
  });

  test('update ticket type via API', async ({ request }) => {
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: { type: 'feat' },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.type).toBe('feat');
  });

  test('update ticket body via API', async ({ request }) => {
    const newBody = '## New Description\nUpdated content by API test';
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: { body: newBody },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.body.raw).toBe(newBody);
  });

  test('update multiple fields at once', async ({ request }) => {
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: {
        title: 'Fully updated ticket',
        type: 'issue',
        status: 'closed',
        body: 'Complete update test',
      },
    });
    expect(res.ok()).toBeTruthy();
    const updated = await res.json();
    expect(updated.title).toBe('Fully updated ticket');
    expect(updated.type).toBe('issue');
    expect(updated.status).toBe('closed');
    expect(updated.body.raw).toBe('Complete update test');
  });

  test('update with empty body returns 400', async ({ request }) => {
    const res = await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: {},
    });
    expect(res.status()).toBe(400);
  });

  test('update non-existent ticket returns 400', async ({ request }) => {
    const res = await request.put(BASE + '/api/tickets/issue-99999', {
      data: { title: 'ghost' },
    });
    expect(res.status()).toBe(400);
  });

  test('update reflects in GET response immediately', async ({ request }) => {
    await request.put(BASE + `/api/tickets/${testTicketId}`, {
      data: { title: 'Updated for verification' },
    });

    const getRes = await request.get(BASE + `/api/tickets/${testTicketId}`);
    const ticket = await getRes.json();
    expect(ticket.title).toBe('Updated for verification');
  });
});

test.describe('Vibe Tracker - Update Ticket UI', () => {

  let testTicketId = '';

  test.beforeEach(async ({ page, request }) => {
    const res = await request.post(BASE + '/api/tickets', {
      data: {
        title: 'UI update test ticket',
        type: 'bug',
        description: 'Test body for UI update testing',
      },
    });
    expect(res.ok()).toBeTruthy();
    const ticket = await res.json();
    testTicketId = ticket.id;
    await page.goto(`${BASE}/tickets/${testTicketId}`);
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async ({ request }) => {
    if (testTicketId) {
      await request.delete(BASE + `/api/tickets/${testTicketId}`);
    }
  });

  test('edit button enters edit mode', async ({ page }) => {
    // Verify we're in view mode (Edit button visible)
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();

    // Click Edit
    await page.locator('button:has-text("Edit")').click();

    // Verify we're in edit mode
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();

    // Title input should be visible and pre-filled
    const titleInput = page.locator('input[type="text"]');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('UI update test ticket');
  });

  test('save changes updates the ticket', async ({ page }) => {
    // Enter edit mode
    await page.locator('button:has-text("Edit")').click();

    // Change the title
    const titleInput = page.locator('input[type="text"]');
    await titleInput.fill('Updated by UI test');

    // Change status via second select (Type is first, Status is second)
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('closed');

    // Save
    await page.locator('button:has-text("Save")').click();

    // Verify the update succeeded - exit edit mode
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();

    // Title should show the new value
    await expect(page.getByRole('heading', { name: 'Updated by UI test' })).toBeVisible();

    // Status badge should show "closed"
    await expect(page.locator('body')).toContainText('closed');
  });

  test('cancel edit discards changes', async ({ page }) => {
    // Enter edit mode
    await page.locator('button:has-text("Edit")').click();

    // Change the title
    const titleInput = page.locator('input[type="text"]');
    await titleInput.fill('Should not be saved');

    // Cancel
    await page.locator('button:has-text("Cancel")').click();

    // Should exit edit mode
    await expect(page.locator('button:has-text("Cancel")')).not.toBeVisible();

    // Title should be back to original
    await expect(page.getByRole('heading', { name: 'UI update test ticket' })).toBeVisible();
  });

  test('edit and save body (markdown)', async ({ page }) => {
    // Enter edit mode
    await page.locator('button:has-text("Edit")').click();

    // Change body
    const bodyTextarea = page.locator('textarea');
    await expect(bodyTextarea).toBeVisible();
    await bodyTextarea.fill('## Updated Body\nThis is the new content');

    // Save
    await page.locator('button:has-text("Save")').click();

    // Rendered content should show the new markdown
    await expect(page.locator('[class*="prose"]')).toContainText('Updated Body');
  });

  test('type select updates correctly', async ({ page }) => {
    // Enter edit mode
    await page.locator('button:has-text("Edit")').click();

    // Change type from bug to feat (first select)
    const typeSelect = page.locator('select').nth(0);
    await typeSelect.selectOption('feat');

    // Save
    await page.locator('button:has-text("Save")').click();

    // Verify type badge shows "feat"
    await expect(page.locator('body')).toContainText('feat');
  });
});

test.describe('Vibe Tracker - API Tests (baseline)', () => {

  test('GET /api/tickets returns the list', async ({ request }) => {
    const res = await request.get(BASE + '/api/tickets');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('tickets');
    expect(Array.isArray(json.tickets)).toBeTruthy();
    expect(json.tickets.length).toBeGreaterThanOrEqual(1);
  });

  test('POST /api/tickets creates a new ticket', async ({ request }) => {
    const res = await request.post(BASE + '/api/tickets', {
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
  });

  test('POST /api/tickets validates required fields', async ({ request }) => {
    const res = await request.post(BASE + '/api/tickets', {
      data: { type: 'feat' },
    });
    expect(res.status()).toBe(400);
  });
});

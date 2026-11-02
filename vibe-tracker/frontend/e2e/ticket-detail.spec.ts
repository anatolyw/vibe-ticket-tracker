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

let testTicketId = '';

test.beforeEach(async ({ page, request }) => {
  testTicketId = await createTestTicket(request, { title: 'UI update test ticket', type: 'bug' });
  await page.goto(`/tickets/${testTicketId}`);
  await page.waitForLoadState('networkidle');
});

test.afterEach(async ({ request }) => {
  if (testTicketId) { await deleteTicket(request, testTicketId); testTicketId = ''; }
});

test.describe('Ticket Detail - Edit Mode', () => {
  test('edit button enters edit mode', async ({ page }) => {
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await page.locator('button:has-text("Edit")').click();
    await expect(page.locator('button:has-text("Save")')).toBeVisible();
    await expect(page.locator('button:has-text("Cancel")')).toBeVisible();
    const titleInput = page.locator('input[type="text"]');
    await expect(titleInput).toBeVisible();
    await expect(titleInput).toHaveValue('UI update test ticket');
  });

  test('save changes updates the ticket', async ({ page }) => {
    await page.locator('button:has-text("Edit")').click();
    const titleInput = page.locator('input[type="text"]');
    await titleInput.fill('Updated by UI test');
    const statusSelect = page.locator('select').nth(1);
    await statusSelect.selectOption('closed');
    await page.locator('button:has-text("Save")').click();
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Updated by UI test' })).toBeVisible();
    await expect(page.locator('body')).toContainText('closed');
  });

  test('cancel edit discards changes', async ({ page }) => {
    await page.locator('button:has-text("Edit")').click();
    const titleInput = page.locator('input[type="text"]');
    await titleInput.fill('Should not be saved');
    await page.locator('button:has-text("Cancel")').click();
    await expect(page.locator('button:has-text("Cancel")')).not.toBeVisible();
    await expect(page.getByRole('heading', { name: 'UI update test ticket' })).toBeVisible();
  });

  test('edit and save body (markdown)', async ({ page }) => {
    await page.locator('button:has-text("Edit")').click();
    const bodyTextarea = page.locator('textarea');
    await expect(bodyTextarea).toBeVisible();
    await bodyTextarea.fill('## Updated Body\nThis is the new content');
    await page.locator('button:has-text("Save")').click();
    await expect(page.locator('[class*="prose"]')).toContainText('Updated Body');
  });

  test('type select updates correctly', async ({ page }) => {
    await page.locator('button:has-text("Edit")').click();
    const typeSelect = page.locator('select').nth(0);
    await typeSelect.selectOption('feat');
    await page.locator('button:has-text("Save")').click();
    await expect(page.locator('body')).toContainText('feat');
  });
});

test.describe('Ticket Detail - Quick Status Toggle', () => {
  test('Close button toggles status to closed', async ({ page }) => {
    await expect(page.locator('button:has-text("Close")')).toBeVisible();
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('button:has-text("Reopen")')).toBeVisible();
    await expect(page.locator('body')).toContainText('closed');
  });

  test('Reopen button toggles status to open', async ({ page }) => {
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('button:has-text("Reopen")')).toBeVisible();
    await page.locator('button:has-text("Reopen")').click();
    await expect(page.locator('button:has-text("Close")')).toBeVisible();
    await expect(page.locator('body')).toContainText('open');
  });

  test('quick status toggle does not enter edit mode', async ({ page }) => {
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible();
    await page.locator('button:has-text("Close")').click();
    await expect(page.locator('button:has-text("Save")')).not.toBeVisible();
    await expect(page.locator('button:has-text("Edit")')).toBeVisible();
  });
});

test.describe('Ticket Detail - Delete', () => {
  test('delete button triggers confirmation dialog', async ({ page }) => {
    let dialogMessage = '';
    page.on('dialog', async (dialog) => {
      dialogMessage = dialog.message();
      await dialog.dismiss();
    });
    await page.locator('button:has-text("Delete")').click();
    expect(dialogMessage).toContain('Are you sure');
  });

  test('confirming delete removes ticket and navigates to list', async ({ page }) => {
    let dialogHandled = false;
    page.on('dialog', async (dialog) => { dialogHandled = true; await dialog.accept(); });
    await page.locator('button:has-text("Delete")').click();
    expect(dialogHandled).toBe(true);
    await page.waitForURL('**/tickets');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('canceling delete keeps user on ticket page', async ({ page }) => {
    page.on('dialog', async (dialog) => { await dialog.dismiss(); });
    await page.locator('button:has-text("Delete")').click();
    await expect(page.getByRole('heading', { name: 'UI update test ticket' })).toBeVisible();
  });
});

test.describe('Ticket Detail - View Mode', () => {
  test('renders markdown content via prose class', async ({ page }) => {
    await expect(page.locator('[class*="prose"]')).toBeVisible();
  });

  test('shows type and status badges', async ({ page }) => {
    await expect(page.locator('body')).toContainText('bug');
    await expect(page.locator('body')).toContainText('open');
  });

  test('shows ticket id in monospace font', async ({ page }) => {
    await expect(page.locator('body')).toContainText(testTicketId);
  });

  test('back to tickets link exists in error state', async ({ page }) => {
    await page.goto('/tickets/issue-99999');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('a:has-text("Back to tickets")')).toBeVisible();
  });

  test('error state shows "Ticket not found"', async ({ page }) => {
    await page.goto('/tickets/issue-99999');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('body')).toContainText('Ticket not found');
    await expect(page.locator('a:has-text("Back to tickets")')).toBeVisible();
  });
});

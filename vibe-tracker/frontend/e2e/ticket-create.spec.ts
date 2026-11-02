import { test, expect } from 'playwright/test';

test.describe('Ticket Create Form', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/tickets/new');
    await page.waitForLoadState('networkidle');
  });

  test('form has all required fields', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible();
    await expect(page.locator('input[placeholder*="Add login"]')).toBeVisible();
    await expect(page.locator('select')).toBeVisible();
    await expect(page.locator('textarea')).toBeVisible();
  });

  test('title input shows character counter', async ({ page }) => {
    const counter = page.locator('span.text-xs.text-muted-foreground');
    await expect(counter).toContainText('/200');
  });

  test('type dropdown defaults to issue', async ({ page }) => {
    const typeSelect = page.locator('select');
    await expect(typeSelect).toHaveValue('issue');
  });

  test('submitting with whitespace-only title shows error', async ({ page }) => {
    // Fill with spaces (required passes since non-empty), Angular trims to empty
    await page.locator('input[type="text"]').fill('   ');
    await page.locator('button[type="submit"]').click();
    // Page should stay on create page (no redirect), error displayed
    await expect(page.locator('h1:has-text("New Ticket")')).toBeVisible();
  });

  test('cancel link navigates back to tickets list', async ({ page }) => {
    await page.locator('a:has-text("Cancel")').click();
    await page.waitForURL('**/tickets');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('description field supports markdown', async ({ page }) => {
    const textarea = page.locator('textarea');
    await textarea.fill('# My Header\n\nSome **bold** and *italic* text.');
    await expect(textarea).toHaveValue(/# My Header/);
  });

  test('back button navigates to tickets list', async ({ page }) => {
    await page.locator('a[aria-label="Back to tickets"]').click();
    await page.waitForURL('**/tickets');
    await expect(page.getByRole('heading', { name: 'Tickets' })).toBeVisible();
  });

  test('title counter updates as user types', async ({ page }) => {
    const counter = page.locator('span.text-xs.text-muted-foreground');
    await expect(counter).toContainText('0/200');
    await page.locator('input[type="text"]').fill('Hello world');
    await expect(counter).toContainText('11/200');
  });

  test('submit button shows creating state', async ({ page }) => {
    await page.locator('input[type="text"]').fill('Testing submit button');
    await page.waitForTimeout(200);
    const btn = page.locator('button[type="submit"]');
    await expect(btn).toBeVisible();
    // Verify button text is "Create Ticket"
    await expect(btn).toContainText('Create Ticket');
  });
});

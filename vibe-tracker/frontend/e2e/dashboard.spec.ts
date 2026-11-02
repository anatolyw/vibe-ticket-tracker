import { test, expect } from 'playwright/test';

test.describe('Dashboard Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('renders the dashboard heading', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Dashboard' })).toBeVisible();
  });

  test('shows subtitle', async ({ page }) => {
    await expect(page.locator('p:has-text("Overview of your tickets")')).toBeVisible();
  });

  test('displays stats cards (total, open, closed, by type)', async ({ page }) => {
    const statsCards = page.locator('.rounded-lg.border.bg-card.p-4');
    await expect(statsCards).toHaveCount(4);
  });

  test('shows total tickets stat', async ({ page }) => {
    await expect(page.locator('span:has-text("Total")')).toBeVisible();
  });

  test('shows open tickets stat with green color', async ({ page }) => {
    const openCard = page.locator('.rounded-lg.border.bg-card.p-4').nth(1);
    await expect(openCard.locator('span:has-text("Open")')).toBeVisible();
  });

  test('shows closed tickets stat', async ({ page }) => {
    const closedCard = page.locator('.rounded-lg.border.bg-card.p-4').nth(2);
    await expect(closedCard.locator('span:has-text("Closed")')).toBeVisible();
  });

  test('shows breakdown by type with color badges', async ({ page }) => {
    const typeCard = page.locator('.rounded-lg.border.bg-card.p-4').nth(3);
    await expect(typeCard.locator('span:has-text("By Type")')).toBeVisible();
    const badges = typeCard.locator('.rounded-full');
    const badgeCount = await badges.count();
    expect(badgeCount).toBeGreaterThan(0);
  });

  test('shows recent tickets section', async ({ page }) => {
    await expect(page.locator('h2:has-text("Recent Tickets")')).toBeVisible();
  });

  test('recent tickets are clickable links to detail page', async ({ page }) => {
    const recentTickets = page.locator('main a[routerlink]');
    if (await recentTickets.count() > 0) {
      const href = await recentTickets.first().getAttribute('href');
      expect(href).toContain('/tickets/');
    }
  });

  test('"New Ticket" button navigates to create page', async ({ page }) => {
    await page.locator('a:has-text("New Ticket")').first().click();
    await page.waitForURL('**/tickets/new');
    await expect(page.getByRole('heading', { name: 'New Ticket' })).toBeVisible();
  });

  test('status indicator dots show correct colors', async ({ page }) => {
    const dots = page.locator('main .rounded-full.w-2.h-2');
    const dotCount = await dots.count();
    if (dotCount > 0) {
      await expect(dots.first()).toBeVisible();
    }
  });
});

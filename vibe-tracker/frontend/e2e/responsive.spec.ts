import { test, expect } from 'playwright/test';

const LARGE_VIEWPORT = { width: 1280, height: 800 };
const SMALL_VIEWPORT = { width: 375, height: 667 };
const MEDIUM_VIEWPORT = { width: 900, height: 667 };

test.describe('Responsive Layout - Large Viewport', () => {
  test.use({ viewport: LARGE_VIEWPORT });

  test('hamburger menu is hidden on large screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await expect(menuBtn).not.toBeVisible();
  });

  test('full sidebar is visible on large screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('app-sidebar aside');
    await expect(sidebar).toBeVisible();
    const width = await sidebar.evaluate((el: Element) => el.getBoundingClientRect().width);
    expect(width).toBeGreaterThan(200);
  });

  test('sidebar text labels are visible on large screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const labels = await page.locator('app-sidebar nav a').evaluateAll((links: Element[]) =>
      links.map((a) => a.querySelector('span.truncate')?.textContent?.trim() ?? '')
    );
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);
  });
});

test.describe('Responsive Layout - Small Viewport', () => {
  test.use({ viewport: SMALL_VIEWPORT });

  test('hamburger menu icon appears on small screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await expect(menuBtn).toBeVisible();
  });

  test('clicking hamburger opens sidebar', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('button[aria-label="Open menu"]').click();
    const sidebar = page.locator('app-sidebar aside');
    await expect(sidebar).toBeVisible();
  });

  test('sidebar shows text labels when opened from hamburger', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.locator('button[aria-label="Open menu"]').click();
    const labels = await page.locator('app-sidebar nav a').evaluateAll((links: Element[]) =>
      links.map((a) => a.querySelector('span.truncate')?.textContent?.trim() ?? '')
    );
    expect(labels).toContain('Dashboard');
    expect(labels).toContain('Tickets');
    expect(labels).toContain('New Ticket');
  });

  test('header title is truncated on small screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const title = page.locator('h1.truncate');
    await expect(title).toBeVisible();
    await expect(title).toHaveClass(/truncate/);
  });

  test('dark mode toggle is accessible on small screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const toggleBtn = page.locator('button[aria-label="Switch to dark mode"]');
    await expect(toggleBtn).toBeVisible();
  });

  test('footer is visible on small screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(footer).toContainText('v0.1.0');
  });
});

test.describe('Responsive Layout - Medium Viewport', () => {
  test.use({ viewport: MEDIUM_VIEWPORT });

  test('hamburger menu is hidden on medium screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const menuBtn = page.locator('button[aria-label="Open menu"]');
    await expect(menuBtn).not.toBeVisible();
  });

  test('full sidebar is visible on medium screens', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const sidebar = page.locator('app-sidebar aside');
    await expect(sidebar).toBeVisible();
  });
});

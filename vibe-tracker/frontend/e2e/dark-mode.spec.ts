import { test, expect } from 'playwright/test';

test.describe('Dark Mode', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  test('toggles dark class on html element', async ({ page }) => {
    const toggleBtn = page.locator('button[aria-label="Switch to dark mode"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(page.locator('html.dark')).toBeVisible();
  });

  test('switches icon from moon to sun when enabling dark mode', async ({ page }) => {
    const toggleBtn = page.locator('button[aria-label="Switch to dark mode"]');
    await expect(toggleBtn).toBeVisible();
    await toggleBtn.click();
    await expect(page.locator('button[aria-label="Switch to light mode"]')).toBeVisible();
  });

  test('toggles light class on html element when switching back', async ({ page }) => {
    await page.locator('button[aria-label="Switch to dark mode"]').click();
    await page.locator('button[aria-label="Switch to light mode"]').click();
    await expect(page.locator('html.dark')).not.toBeVisible();
  });

  test('switches icon from sun to moon when enabling light mode', async ({ page }) => {
    await page.locator('button[aria-label="Switch to dark mode"]').click();
    await page.locator('button[aria-label="Switch to light mode"]').click();
    await expect(page.locator('button[aria-label="Switch to dark mode"]')).toBeVisible();
  });

  test('theme preference persists in localStorage after toggle', async ({ page }) => {
    await page.locator('button[aria-label="Switch to dark mode"]').click();
    await page.waitForTimeout(300);
    const stored = await page.evaluate(() => localStorage.getItem('vibe-tracker-theme'));
    expect(stored).toBe('dark');
  });

  test('dark mode icon is visible in header', async ({ page }) => {
    const icon = page.locator('button[aria-label]').locator('svg').first();
    await expect(icon).toBeVisible();
  });
});

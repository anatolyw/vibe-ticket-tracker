import { test, expect } from 'playwright/test';

const LARGE_VIEWPORT = { width: 1280, height: 800 };

function getLabelTexts(page: any) {
  return page.locator('app-sidebar nav a').evaluateAll(
    (links: Element[]) =>
      links.map((a) => a.querySelector('span.truncate')?.textContent?.trim() ?? '')
  );
}

function getSidebarClass(page: any) {
  return page.locator('app-sidebar aside').getAttribute('class');
}

test.describe('Sidebar Collapse/Expand', () => {
  test.use({ viewport: LARGE_VIEWPORT });

  test('sidebar starts expanded with icon + text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('app-sidebar aside');
    await expect(sidebar).toBeVisible();

    const labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);
  });

  test('clicking collapse button minimizes sidebar to icons only', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);

    const collapseBtn = page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]');
    await expect(collapseBtn).toBeVisible();
    await collapseBtn.click();
    await page.waitForTimeout(200);

    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);

    const dashboardLink = page.locator('app-sidebar nav a').first();
    await expect(dashboardLink.locator('lucide-icon')).toBeVisible();

    const expandBtn = page.locator('app-sidebar aside button[aria-label="Expand sidebar"]');
    await expect(expandBtn).toBeVisible();

    const sidebarClass = await getSidebarClass(page);
    expect(sidebarClass).toContain('md:w-16');
    expect(sidebarClass).not.toContain('md:w-64');
  });

  test('clicking expand button restores full sidebar with text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);

    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    const expandBtn = page.locator('app-sidebar aside button[aria-label="Expand sidebar"]');
    await expandBtn.click();
    await page.waitForTimeout(200);

    labels = await getLabelTexts(page);
    expect(labels).toEqual(['Dashboard', 'Tickets', 'New Ticket']);

    const sidebarClass = await getSidebarClass(page);
    expect(sidebarClass).toContain('md:w-64');
  });

  test('multiple collapse/expand toggles work correctly', async ({ page }) => {
    await page.goto('/');
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

  test('collapsed sidebar uses narrower CSS class', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const sidebar = page.locator('app-sidebar aside');

    let classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-64');

    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);

    classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-16');
    expect(classes).not.toContain('md:w-64');

    await page.locator('app-sidebar aside button[aria-label="Expand sidebar"]').click();
    await page.waitForTimeout(200);

    classes = await sidebar.getAttribute('class');
    expect(classes).toContain('md:w-64');
    expect(classes).not.toContain('md:w-16');
  });

  test('collapse/expand icon reflects sidebar state', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const button = page.locator('app-sidebar aside button');
    const svg = button.locator('svg');

    const getChevronDirection = async () => {
      const svgContent = await svg.innerHTML();
      if (svgContent.includes('-5-5')) return 'left';
      if (svgContent.includes(' 5 5')) return 'right';
      return 'unknown';
    };

    expect(await getChevronDirection()).toBe('left');

    await button.click();
    await page.waitForTimeout(200);
    expect(await getChevronDirection()).toBe('right');

    await button.click();
    await page.waitForTimeout(200);
    expect(await getChevronDirection()).toBe('left');

    await button.click();
    await page.waitForTimeout(200);
    expect(await getChevronDirection()).toBe('right');
  });

  test('localStorage persists collapse state across navigation', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    await page.locator('app-sidebar aside button[aria-label="Collapse sidebar"]').click();
    await page.waitForTimeout(200);
    let labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();

    await page.goto('/tickets');
    await page.waitForLoadState('networkidle');

    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    labels = await getLabelTexts(page);
    expect(labels).toEqual(['', '', '']);
    await expect(page.locator('app-sidebar aside button[aria-label="Expand sidebar"]')).toBeVisible();
  });
});

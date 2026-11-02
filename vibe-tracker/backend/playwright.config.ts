import { defineConfig } from 'playwright/test';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  timeout: 60_000,
  expect: { timeout: 5_000 },
  use: {
    trace: 'on-first-retry',
  },
  globalSetup: './e2e/shared/global-setup.cjs',
  globalTeardown: './e2e/shared/global-teardown.cjs',
  reporter: 'list',
});

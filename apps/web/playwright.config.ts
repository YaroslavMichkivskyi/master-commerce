import { defineConfig, devices } from '@playwright/test';

// Visual, accessibility and budget tests of the storefront (specs/036-web-design R-7, R-8).
// They run inside Docker only — `pnpm --filter web test:visual` (scripts/visual.mjs) starts
// e2e/compose.yaml: the shop and its services, and these tests in the official Playwright
// image, so every machine renders the same pixels.

const SHOP = process.env.VISUAL_SHOP_URL ?? 'http://web:3000';

const phone = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const tablet = { viewport: { width: 768, height: 1024 } };
const desktop = { viewport: { width: 1280, height: 800 } };

export default defineConfig({
  testDir: './e2e',
  outputDir: './e2e/.results',
  snapshotPathTemplate: '{testDir}/__screenshots__/{testFilePath}/{arg}-{projectName}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: 0,
  workers: process.env.CI ? 2 : 4,
  reporter: [['list'], ['html', { outputFolder: './e2e/.report', open: 'never' }]],
  expect: {
    toHaveScreenshot: { animations: 'disabled', caret: 'hide', maxDiffPixelRatio: 0.001 },
  },
  use: {
    baseURL: SHOP,
    ...devices['Desktop Chrome'],
    colorScheme: 'light',
    locale: 'en-IE',
    timezoneId: 'Europe/Prague',
    trace: 'retain-on-failure',
  },
  projects: [
    { name: 'phone', use: phone, testIgnore: /no-js\.spec\.ts/ },
    { name: 'tablet', use: tablet, testIgnore: /no-js\.spec\.ts/ },
    { name: 'desktop', use: desktop, testIgnore: /no-js\.spec\.ts/ },
    // FR-013: the storefront without JavaScript (only the no-js spec runs here).
    { name: 'no-js', use: { ...phone, javaScriptEnabled: false }, testMatch: /no-js\.spec\.ts/ },
  ],
});

/** The shop whose gateway is down (TC-16). */
export const DEAD_SHOP = process.env.VISUAL_DEAD_URL ?? 'http://web-dead:3000';

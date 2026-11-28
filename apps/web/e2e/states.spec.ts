import { DEAD_SHOP } from '../playwright.config';
import { expect, look, test } from './fixtures';

// TC-07, TC-13…TC-16, TC-29: empty, long, large, not found, unavailable, extreme widths.

const project = () => test.info().project.name;

test('empty category', async ({ page }) => {
  await page.goto('/c/empty-shelf');
  await expect(page.getByText('No products here yet')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse the categories' })).toBeVisible();
  await look(page, 'empty-category');
});

test('long names', async ({ page }) => {
  await page.goto('/c/graphics-cards');
  const card = page.locator('article[data-slug="visual-long-name"]');
  const name = card.getByRole('heading').getByRole('link');
  // The full name stays in the title; the card shows two lines and keeps the row height.
  await expect(name).toHaveAttribute('title', /Extra Long|Aura Sync/);
  const [cardBox, rowBoxes] = await Promise.all([
    card.boundingBox(),
    page
      .locator('article')
      .evaluateAll((all) => all.slice(0, 4).map((a) => a.getBoundingClientRect().height)),
  ]);
  expect(cardBox!.height).toBeGreaterThan(0);
  expect(new Set(rowBoxes.slice(0, project() === 'phone' ? 2 : 4)).size).toBe(1);

  await page.goto('/p/visual-long-name');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(page.viewportSize()!.width);
  await look(page, 'product-long-name');
});

test('large price fits on one line', async ({ page }) => {
  test.skip(project() !== 'phone', 'the narrow width is the case (TC-14)');
  await page.goto('/p/visual-big-price');
  const price = page.getByText('€12,999.99');
  const box = await price.boundingBox();
  const lineHeight = await price.evaluate((el) => parseFloat(getComputedStyle(el).lineHeight));
  expect(box!.height).toBeLessThanOrEqual(lineHeight * 1.2);
});

test('not found', async ({ page }) => {
  const response = await page.goto('/p/does-not-exist');
  expect(response!.status()).toBe(404);
  await expect(page.getByRole('heading', { level: 1, name: 'Page not found' })).toBeVisible();
  await look(page, 'not-found');
});

test('catalog unavailable', async ({ page }) => {
  const response = await page.goto(`${DEAD_SHOP}/c/graphics-cards`);
  // A 5xx, as in TASK-6 (its TC-21); never a 200 with an error message.
  expect(response!.status()).toBeGreaterThanOrEqual(500);
  expect(response!.status()).toBeLessThan(600);
  // In <main>: Next's route announcer is an (empty) alert too.
  await expect(page.getByRole('main').getByRole('alert')).toContainText(
    'The catalog is unavailable right now',
  );
  await expect(page.getByRole('button', { name: 'Try again' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('CatalogUnavailableError');
  await look(page, 'unavailable');
});

test.describe('extreme widths', () => {
  test('320 px: no sideways scroll', async ({ page }) => {
    test.skip(project() !== 'phone', 'once (TC-29)');
    await page.setViewportSize({ width: 320, height: 700 });
    await page.goto('/c/graphics-cards');
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(
      320,
    );
  });

  test('2560 px: content centred within the maximum width', async ({ page }) => {
    test.skip(project() !== 'desktop', 'once (TC-29)');
    await page.setViewportSize({ width: 2560, height: 1200 });
    await page.goto('/c/graphics-cards');
    const main = await page.locator('main').boundingBox();
    expect(main!.width).toBeLessThanOrEqual(1440);
    expect(Math.abs(main!.x - (2560 - main!.x - main!.width))).toBeLessThanOrEqual(2);
  });
});

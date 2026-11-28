import { expect, look, test } from './fixtures';

// TC-11, TC-12: the product page — the key facts above the fold, and "out of stock" told
// in words, not by colour.

test('above the fold', async ({ page }, info) => {
  await page.goto('/p/visual-big-price');
  const h1 = page.getByRole('heading', { level: 1 });
  await expect(h1).toHaveText('Visual Test Workstation RTX 9000 96GB');
  if (info.project.name === 'desktop') {
    // Name, brand, price with VAT, stock and the first five specs in the first 800 px.
    const facts = [h1, page.getByText('incl. VAT'), page.getByText('In stock', { exact: true })];
    for (const fact of facts) {
      const box = await fact.boundingBox();
      expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    }
    const specs = page.locator('dl dt');
    expect(await specs.count()).toBeLessThanOrEqual(5);
    const lastSpec = await specs.last().boundingBox();
    expect(lastSpec!.y + lastSpec!.height).toBeLessThanOrEqual(800);
  }
  await expect(page.getByRole('heading', { name: 'Specifications' })).toBeVisible();
  await look(page, 'product');
});

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' });
  test('product in the dark theme', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'dark: desktop only');
    await page.goto('/p/visual-big-price');
    await look(page, 'product-dark');
  });
});

test('out of stock', async ({ page }) => {
  await page.goto('/p/visual-out-of-stock');
  await expect(page.getByText('Out of stock', { exact: true })).toBeVisible();
  await look(page, 'product-out-of-stock');
});

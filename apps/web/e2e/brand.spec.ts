import { expect, look, test } from './fixtures';

// TC-08: a brand list looks like a category list, with the brand as its heading.

test('brand', async ({ page }) => {
  await page.goto('/brands/asus');
  await expect(page.getByRole('heading', { level: 1, name: 'ASUS' })).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Breadcrumb' })).toBeVisible();
  await look(page, 'brand');
});

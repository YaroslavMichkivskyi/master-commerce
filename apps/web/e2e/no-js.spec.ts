import { expect, test } from './fixtures';

// TC-19 (project `no-js`, a phone with JavaScript off): everything a customer does works.

test('storefront without JavaScript', async ({ page }) => {
  await page.goto('/c/graphics-cards');
  // No theme switch without JavaScript; the theme follows the device.
  await expect(page.getByRole('button', { name: /Switch to the/ })).toHaveCount(0);
  await expect(page.locator('html')).not.toHaveAttribute('data-theme', /.+/);

  // The filters open from their <details>; a brand is a link.
  await page.locator('details[data-filter-toggle] summary').click();
  await expect(page.locator('#filters')).toBeVisible();
  await page.locator('section[data-facet="brand"] a').first().click();
  await expect(page).toHaveURL(/brand=/);

  // Sort: the form's "Apply" button (shown in <noscript>).
  await page.locator('#sort').selectOption('price-asc');
  await page.getByRole('button', { name: 'Apply' }).last().click();
  await expect(page).toHaveURL(/sort=price-asc/);

  // Page 2.
  await page.goto('/c/components');
  await page.getByRole('navigation', { name: 'Pages' }).getByRole('link', { name: '2' }).click();
  await expect(page).toHaveURL(/page=2/);

  // The catalog menu, then a subcategory.
  await page.locator('details[data-menu] summary').click();
  await page
    .getByRole('navigation', { name: 'Catalog' })
    .getByRole('link', { name: 'SSDs' })
    .click();
  await expect(page).toHaveURL(/\/c\/ssds/);

  // Search.
  await page.getByRole('searchbox', { name: 'Search products' }).fill('ssd');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/search\?q=ssd/);
});

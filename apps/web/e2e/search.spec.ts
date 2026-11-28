import { expect, look, test } from './fixtures';

// TC-09, TC-10: search from the header, and a search with no match.

test('results', async ({ page }) => {
  await page.goto('/');
  const field = page.getByRole('searchbox', { name: 'Search products' });
  await field.fill('rtx');
  await field.press('Enter');
  await expect(page).toHaveURL(/\/search\?q=rtx$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Results for “rtx”');
  await look(page, 'search');
});

test('no match', async ({ page }) => {
  await page.goto('/search?q=zzzz');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Nothing found for “zzzz”');
  await expect(
    page.getByRole('list', { name: 'Categories' }).getByRole('link').first(),
  ).toBeVisible();
  await look(page, 'search-no-match');
});

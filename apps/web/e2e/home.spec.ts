import { expect, look, test } from './fixtures';

// TC-01: the home page at every width, light; dark too on desktop.

test('home', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByRole('heading', { level: 1, name: 'Computer hardware' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'New in' })).toBeVisible();
  await expect(page.locator('section[aria-labelledby="new-in"] article')).toHaveCount(12);
  await look(page, 'home');
});

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' });

  test('home in the dark theme', async ({ page }, info) => {
    test.skip(info.project.name !== 'desktop', 'dark: desktop only');
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await look(page, 'home-dark');
  });
});

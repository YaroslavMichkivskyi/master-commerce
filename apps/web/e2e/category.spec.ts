import { expect, look, test } from './fixtures';

// TC-02…TC-06: a category list — layout per width, the phone filter panel, chips, many
// facet values, pagination.

const project = () => test.info().project.name;

test('category', async ({ page }) => {
  await page.goto('/c/graphics-cards');
  await expect(page.getByRole('heading', { level: 1, name: 'Graphics cards' })).toBeVisible();
  if (project() === 'phone') {
    // TC-03 step 1 without filters: one control, no count, the column hidden.
    await expect(page.locator('details[data-filter-toggle] summary')).toBeVisible();
    await expect(page.locator('#filters')).toBeHidden();
  } else {
    // TC-02: the filter column beside the grid, nothing to open.
    await expect(page.locator('#filters')).toBeVisible();
  }
  await look(page, 'category');
});

test.describe('dark', () => {
  test.use({ colorScheme: 'dark' });
  test('category in the dark theme', async ({ page }) => {
    test.skip(project() !== 'desktop', 'dark: desktop only');
    await page.goto('/c/graphics-cards');
    await look(page, 'category-dark');
  });
});

test('phone filters: one control with the applied count, a full-screen panel', async ({ page }) => {
  test.skip(project() !== 'phone', 'phone only (TC-03)');
  await page.goto('/c/graphics-cards?brand=asus');
  const toggle = page.locator('details[data-filter-toggle] summary');
  await expect(toggle).toContainText('1');
  const width = await page.evaluate(() => document.documentElement.scrollWidth);
  expect(width).toBeLessThanOrEqual(390);

  await toggle.click();
  const panel = page.locator('#filters');
  await expect(panel).toBeVisible();
  await expect(panel).toHaveAttribute('role', 'dialog');
  await expect(panel).toBeFocused();
  await look(page, 'category-phone-filters', { screen: true });

  // Escape closes it and gives the focus back to the button (TC-20).
  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toBeFocused();
});

test('chips: one per applied filter, each removes only its own', async ({ page }) => {
  test.skip(project() !== 'desktop', 'one width is enough (TC-04)');
  await page.goto('/c/graphics-cards?brand=asus,msi&stock=in&page=2');
  const chips = page.getByRole('list', { name: 'Applied filters' });
  await expect(chips.getByRole('link')).toHaveText([/In stock only/, /Brand: ASUS/, /Brand: MSI/]);
  await chips.getByRole('link', { name: /Brand: MSI/ }).click();
  await expect(page).toHaveURL(/\/c\/graphics-cards\?brand=asus&stock=in$/);
});

test('many facet values: 8 shown, the rest behind "Show all"', async ({ page }) => {
  test.skip(project() !== 'desktop', 'desktop column (TC-05)');
  await page.goto('/c/components');
  const brand = page.locator('section[data-facet="brand"]');
  const more = brand.locator('summary');
  await expect(more.getByText(/Show all \(\d+\)/)).toBeVisible();
  await expect(brand.locator('ul').first().locator('li')).toHaveCount(8);
  await more.click();
  await expect(more.getByText('Show less')).toBeVisible();
  await expect(more.getByText(/Show all/)).toBeHidden();
  await look(page, 'category-show-all');
});

test('pagination: a short stable set on the last page, none on a single page', async ({ page }) => {
  test.skip(project() !== 'desktop', 'one width is enough (TC-06)');
  await page.goto('/c/components');
  const pages = page.getByRole('navigation', { name: 'Pages' });
  const last = await pages.locator('li a, li span[aria-current]').last().textContent();
  await page.goto(`/c/components?page=${last}`);
  await expect(pages.locator('[aria-current="page"]')).toHaveText(last!);
  const shown = await pages.locator('li').count();
  expect(shown).toBeLessThanOrEqual(9);

  await page.goto('/c/empty-shelf');
  await expect(page.getByRole('navigation', { name: 'Pages' })).toHaveCount(0);
});

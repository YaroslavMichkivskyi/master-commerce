import { expect, look, test } from './fixtures';

// TC-17, TC-18, part of TC-20: the mega-menu, the theme, keyboard focus in the header.

test('mega-menu', async ({ page }, info) => {
  await page.goto('/');
  const button = page.locator('details[data-menu] summary');
  await button.click();
  const menu = page.getByRole('navigation', { name: 'Catalog' });
  await expect(menu).toBeVisible();
  await expect(menu.getByRole('link', { name: /^Components/ })).toBeVisible();
  await expect(menu.getByRole('link', { name: 'Graphics cards' })).toBeVisible();
  if (info.project.name === 'phone') {
    // Full screen on a phone.
    const box = await menu.locator('xpath=..').boundingBox();
    expect(box!.width).toBe(390);
  }
  await look(page, 'mega-menu', { screen: true });

  await page.keyboard.press('Escape');
  await expect(menu).toBeHidden();
  await expect(button).toBeFocused();
});

test.describe('theme', () => {
  test.use({ colorScheme: 'dark' });

  test('the first visit takes the device theme and keeps it; two positions', async ({
    page,
  }, info) => {
    test.skip(info.project.name !== 'desktop', 'once (TC-18)');
    await page.goto('/');
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    expect(await page.evaluate(() => localStorage.getItem('theme'))).toBe('dark');

    // The device turns light: the stored theme stays.
    await page.emulateMedia({ colorScheme: 'light' });
    await page.reload();
    await expect(html).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Switch to the light theme' }).click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect(page.getByRole('button', { name: 'Switch to the dark theme' })).toBeVisible();

    // After a reload the page is light from its first frame: the attribute is in place
    // before any script of the page runs.
    await page.addInitScript(() => {
      document.addEventListener('readystatechange', () => {
        (window as unknown as { firstTheme?: string }).firstTheme ??=
          document.documentElement.dataset.theme;
      });
    });
    await page.reload();
    expect(
      await page.evaluate(() => (window as unknown as { firstTheme?: string }).firstTheme),
    ).toBe('light');
  });
});

test('keyboard: skip link first, then logo, catalog, search', async ({ page }, info) => {
  test.skip(info.project.name !== 'desktop', 'once (TC-20, partly)');
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('header a[href="/"]').first()).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.locator('details[data-menu] summary')).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeFocused();
  await page.keyboard.press('Tab');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Switch to the/ })).toBeFocused();
});

// Found by the AI review of TASK-36: on a phone the search sits on a second row, so the
// theme switch of the first row must come before it in the Tab order (WCAG 2.4.3).
test('keyboard on a phone follows the screen: catalog, theme, then search', async ({
  page,
}, info) => {
  test.skip(info.project.name !== 'phone', 'the phone layout');
  await page.goto('/');
  await page.locator('details[data-menu] summary').focus();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('button', { name: /Switch to the/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(page.getByRole('searchbox', { name: 'Search products' })).toBeFocused();
});

// Found by the AI review of TASK-36: links standing alone are 24 px tall at least (FR-020).
test('small links are 24 px targets at least', async ({ page }, info) => {
  test.skip(info.project.name !== 'phone', 'once, at the narrowest width');
  const tall = async (selector: string) => {
    const box = await page.locator(selector).first().boundingBox();
    expect(box!.height, selector).toBeGreaterThanOrEqual(24);
  };
  await page.goto('/c/graphics-cards?price=100-1000');
  await tall('article a[href^="/brands/"]');
  await page.locator('details[data-filter-toggle] summary').click();
  await tall('section[data-facet="price"] a');
  await page.goto('/p/visual-big-price');
  await tall('main a[href^="/brands/"]');
});

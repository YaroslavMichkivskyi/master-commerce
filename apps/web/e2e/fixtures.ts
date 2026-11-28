import AxeBuilder from '@axe-core/playwright';
import { test as base, expect, type Page } from '@playwright/test';

// What every visual case does (test-cases.md TC-22, R-8): wait for the fonts, compare the
// full page with its reference screenshot, and run axe with the WCAG 2.0–2.2 A / AA rules —
// zero violations.

export const AXE_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

/** Violations as short lines, so a failure says what and where. */
function describe(violations: Awaited<ReturnType<AxeBuilder['analyze']>>['violations']) {
  return violations
    .map(
      (v) =>
        `${v.id} (${v.impact}): ${v.help}\n  ${v.nodes.map((n) => n.target.join(' ')).join('\n  ')}`,
    )
    .join('\n');
}

export async function axeCheck(page: Page) {
  const { violations } = await new AxeBuilder({ page }).withTags(AXE_TAGS).analyze();
  expect(violations, describe(violations)).toEqual([]);
}

/**
 * The screenshot of the whole page, then the accessibility check. An open overlay (the
 * phone filter panel, the menu) covers the screen, not the page: `screen` takes the
 * viewport only, as a customer sees it.
 */
export async function look(page: Page, name: string, { screen = false } = {}) {
  await page.evaluate(() => document.fonts.ready);
  await expect(page).toHaveScreenshot(`${name}.png`, { fullPage: !screen });
  await axeCheck(page);
}

export const test = base;
export { expect };

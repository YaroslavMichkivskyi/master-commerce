import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// WCAG 2.2 contrast of the design tokens in both themes (FR-001, FR-020, research R-2):
// a token change that breaks AA fails here, not in a browser.

const css = readFileSync(new URL('./theme.css', import.meta.url), 'utf8');

type Theme = 'light' | 'dark';
const tokens = new Map<string, Record<Theme, string>>();
for (const [, name, light, dark] of css.matchAll(
  /--color-([\w-]+):\s*light-dark\((#[0-9a-f]{6}),\s*(#[0-9a-f]{6})\);/gi,
)) {
  tokens.set(name!, { light: light!, dark: dark! });
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi! + 0.05) / (lo! + 0.05);
}

// [foreground, background]: text needs 4.5:1, parts of the interface 3:1.
const text: [string, string][] = [
  ['text', 'bg'],
  ['text', 'surface'],
  ['text', 'surface-2'],
  ['text', 'accent-soft'],
  ['muted', 'bg'],
  ['muted', 'surface'],
  ['muted', 'surface-2'],
  ['accent', 'bg'],
  ['accent', 'surface'],
  ['accent', 'accent-soft'],
  ['on-accent', 'accent'],
  ['on-accent', 'accent-hover'],
  ['success', 'surface'],
  ['success', 'success-soft'],
  ['danger', 'surface'],
  ['danger', 'danger-soft'],
];
const ui: [string, string][] = [
  ['border-strong', 'bg'],
  ['border-strong', 'surface'],
  ['border-strong', 'surface-2'],
  ['focus', 'bg'],
  ['focus', 'surface'],
  ['accent', 'surface-2'],
];

describe('theme tokens', () => {
  it('declare every colour as light-dark() of two hex values', () => {
    const declared = [...css.matchAll(/--color-([\w-]+):(?!\s*initial)/g)].map((m) => m[1]);
    expect(declared.length).toBeGreaterThan(0);
    expect(declared.filter((name) => !tokens.has(name!))).toEqual([]);
  });

  for (const theme of ['light', 'dark'] as const) {
    for (const [pairs, min] of [
      [text, 4.5],
      [ui, 3],
    ] as const) {
      it.each(pairs)(`${theme}: %s on %s has contrast ≥ ${min}:1`, (fg, bg) => {
        const f = tokens.get(fg)?.[theme];
        const b = tokens.get(bg)?.[theme];
        expect(f, fg).toBeDefined();
        expect(b, bg).toBeDefined();
        expect(contrast(f!, b!)).toBeGreaterThanOrEqual(min);
      });
    }
  }

  it('computes contrast the WCAG way', () => {
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrast('#777777', '#ffffff')).toBeCloseTo(4.48, 2);
  });
});

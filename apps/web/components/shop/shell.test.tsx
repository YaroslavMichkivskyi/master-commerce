import type { StorefrontCategoryNodeDto } from '@master-commerce/dto';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { currentTheme, otherTheme, themeScript } from '../../lib/theme';
import { render } from '../../test/gateway-stub';
import { SiteFooter } from './footer';
import { SiteHeader } from './header';
import { MegaMenu } from './mega-menu';
import { ThemeSwitch } from './theme-switch';

// The shell rendered on the server (FR-005, FR-007, FR-013, FR-020): what works without
// JavaScript is in the HTML; the islands' behaviour is checked in the browser (phase 7).

const node = (name: string, children: StorefrontCategoryNodeDto[] = []) => ({
  id: name,
  name,
  slug: name.toLowerCase().replace(/ /g, '-'),
  productCount: 42,
  children,
});
const tree = [
  node('Components', [node('Graphics cards'), node('CPUs')]),
  node('Peripherals', [node('Mice')]),
];

describe('header', () => {
  const html = render(<SiteHeader tree={tree} />);

  it('is the banner landmark with a skip link to the content first', () => {
    expect(html).toMatch(/^<header[^>]*><a href="#main"[^>]*>Skip to content<\/a>/);
  });

  it('searches with a GET form to /search that has a labelled field', () => {
    const form = /<form[^>]*>/.exec(html)![0];
    for (const attr of ['role="search"', 'action="/search"', 'method="get"']) {
      expect(form).toContain(attr);
    }
    expect(html).toMatch(/<input[^>]*type="search"[^>]*name="q"/);
    expect(html).toContain('aria-label="Search products"');
    expect(html).toMatch(/<button type="submit"[^>]*aria-label="Search"/);
  });

  it('has the logo link home', () => {
    expect(html).toMatch(/<a href="\/"[^>]*>.*master-.*commerce.*<\/a>/);
  });
});

describe('mega-menu', () => {
  const html = render(<MegaMenu tree={tree} />);

  it('is a closed <details>, so it works without JavaScript', () => {
    expect(html).toMatch(/^<details data-menu="true"/);
    expect(html).not.toMatch(/^<details[^>]* open/);
    expect(html).toContain('<summary');
  });

  it('links both levels of the tree, top level with its count', () => {
    expect(html).toContain('<nav aria-label="Catalog"');
    for (const slug of ['components', 'graphics-cards', 'cpus', 'peripherals', 'mice']) {
      expect(html).toContain(`href="/c/${slug}"`);
    }
    expect(html).toMatch(/Components<span[^>]*>42<\/span>/);
  });
});

describe('footer', () => {
  it('is the contentinfo landmark with the top categories', () => {
    const html = render(<SiteFooter tree={tree} />);
    expect(html).toMatch(/^<footer/);
    expect(html).toContain('href="/c/components"');
    expect(html).not.toContain('href="/c/graphics-cards"');
    expect(html).toContain('All prices include VAT');
  });

  it('leaves the category list out while the catalog is unavailable', () => {
    expect(render(<SiteFooter tree={[]} />)).not.toContain('<nav');
  });
});

describe('theme', () => {
  it('the switch renders only a place of its size on the server (hidden without JS)', () => {
    // A block: an inline span would ignore its size and the header would move on mount.
    expect(render(<ThemeSwitch />)).toBe('<span aria-hidden="true" class="block size-10"></span>');
  });

  it('the switch has two positions: light ⇄ dark', () => {
    expect(otherTheme('light')).toBe('dark');
    expect(otherTheme('dark')).toBe('light');
  });

  it('the page theme is the one the head script set, else the device one', () => {
    expect(currentTheme({ dataset: { theme: 'light' } }, true)).toBe('light');
    expect(currentTheme({ dataset: {} }, true)).toBe('dark');
    expect(currentTheme({ dataset: {} }, false)).toBe('light');
  });

  /** Runs the head script; answers the theme set and what was stored. */
  const run = (stored: string | null, deviceDark = false, throws = false) => {
    const dataset: Record<string, string> = {};
    const kept: Record<string, string> = {};
    const localStorage = {
      getItem: () => {
        if (throws) throw new Error('blocked');
        return stored;
      },
      setItem: (k: string, v: string) => {
        kept[k] = v;
      },
    };
    const matchMedia = () => ({ matches: deviceDark });
    runInNewContext(themeScript, {
      localStorage,
      matchMedia,
      document: { documentElement: { dataset } },
    });
    return { theme: dataset.theme, kept: kept.theme };
  };

  it('the head script applies a stored theme and stores nothing new', () => {
    expect(run('dark')).toEqual({ theme: 'dark', kept: undefined });
    expect(run('light', true)).toEqual({ theme: 'light', kept: undefined });
  });

  it('on the first visit it takes the device theme and keeps it', () => {
    expect(run(null, true)).toEqual({ theme: 'dark', kept: 'dark' });
    expect(run(null, false)).toEqual({ theme: 'light', kept: 'light' });
    expect(run('<script>', true)).toEqual({ theme: 'dark', kept: 'dark' });
  });

  it('with storage blocked it leaves the device theme to CSS', () => {
    expect(run('dark', true, true)).toEqual({ theme: undefined, kept: undefined });
  });
});

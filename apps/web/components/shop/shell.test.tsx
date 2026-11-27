import type { StorefrontCategoryNodeDto } from '@master-commerce/dto';
import { runInNewContext } from 'node:vm';
import { describe, expect, it } from 'vitest';
import { nextChoice, readChoice, themeScript } from '../../lib/theme';
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
    expect(render(<ThemeSwitch />)).toBe('<span aria-hidden="true" class="size-10"></span>');
  });

  it('the switch goes light → dark → device → light', () => {
    expect(nextChoice('light')).toBe('dark');
    expect(nextChoice('dark')).toBe('device');
    expect(nextChoice('device')).toBe('light');
  });

  it('a stored value other than light / dark means the device theme', () => {
    expect(readChoice('dark')).toBe('dark');
    expect(readChoice(null)).toBe('device');
    expect(readChoice('blue')).toBe('device');
  });

  const run = (stored: string | null, throws = false) => {
    const dataset: Record<string, string> = {};
    const localStorage = {
      getItem: () => {
        if (throws) throw new Error('blocked');
        return stored;
      },
    };
    runInNewContext(themeScript, { localStorage, document: { documentElement: { dataset } } });
    return dataset.theme;
  };

  it('the head script sets data-theme from a stored choice only', () => {
    expect(run('dark')).toBe('dark');
    expect(run('light')).toBe('light');
    expect(run(null)).toBeUndefined();
    expect(run('<script>')).toBeUndefined();
  });

  it('the head script survives blocked storage', () => {
    expect(run('dark', true)).toBeUndefined();
  });
});

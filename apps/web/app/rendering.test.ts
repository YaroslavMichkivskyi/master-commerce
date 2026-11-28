import { describe, expect, it } from 'vitest';
import config from '../next.config';
import * as brand from './brands/[slug]/page';
import * as category from './c/[slug]/page';
import * as product from './p/[slug]/page';
import * as home from './page';
import * as search from './search/page';

// How each page is rendered (ADR 0025). The export is the whole decision, so a change of
// it must be deliberate: this test fails and points at the ADR.
describe('rendering strategy (ADR 0025)', () => {
  it('builds product pages on demand and keeps them for 5 minutes (ISR)', () => {
    expect(product.revalidate).toBe(300);
    expect(product.generateStaticParams()).toEqual([]);
  });

  it('renders the home page per request: a build has no catalog to ask', () => {
    expect(home.dynamic).toBe('force-dynamic');
  });

  it('renders lists per request, so redirects, 404 and 5xx are real statuses', () => {
    for (const page of [category, brand, search] as Record<string, unknown>[]) {
      expect(page.revalidate).toBeUndefined();
      expect(page.dynamic).toBeUndefined();
      expect(page.generateStaticParams).toBeUndefined();
    }
  });

  it('keeps the page and data caches in memory only: made-up addresses never fill a disk', () => {
    // Found by the AI review of TASK-36: every address, a 404 too, makes a cache entry.
    expect(config.experimental?.isrFlushToDisk).toBe(false);
  });
});

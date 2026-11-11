import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, describe, expect, it, vi } from 'vitest';
import HomePage from './page';

async function render(): Promise<string> {
  return renderToStaticMarkup(await HomePage());
}

function gatewayAnswers(status: number, body: unknown) {
  vi.stubGlobal(
    'fetch',
    vi.fn(() => Promise.resolve(new Response(JSON.stringify(body), { status }))),
  );
}

describe('home page (FR-030)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('lists the categories from the gateway', async () => {
    gatewayAnswers(200, {
      items: [
        { id: '1', name: 'CPUs', slug: 'cpus', sortOrder: 10 },
        { id: '2', name: 'Graphics cards', slug: 'graphics-cards', sortOrder: 20 },
      ],
    });
    const html = await render();
    expect(html).toContain('<li data-slug="cpus">CPUs</li>');
    expect(html).toContain('Graphics cards');
  });

  it('shows an empty state', async () => {
    gatewayAnswers(200, { items: [] });
    expect(await render()).toContain('No categories yet.');
  });

  it('shows "unavailable" on a problem response', async () => {
    gatewayAnswers(503, { status: 503, title: 'Service Unavailable' });
    expect(await render()).toContain('The catalog is unavailable right now');
  });

  it('shows "unavailable" when the gateway is unreachable', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.reject(new TypeError('fetch failed'))),
    );
    expect(await render()).toContain('The catalog is unavailable right now');
  });
});

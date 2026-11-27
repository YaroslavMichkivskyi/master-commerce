import { ProductGrid } from '../components/storefront';
import type { Metadata } from 'next';
import { CatalogUnavailableError, catalog } from '../lib/catalog';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Rendered per request, never at build time: a build has no catalog to ask, and a home
// page frozen as "unavailable" must not be served. The tree is still cached for 5 minutes
// in the data cache (lib/catalog.ts).
export const dynamic = 'force-dynamic';

/** Home: the top categories and the newest products (FR-030). */
export default async function HomePage() {
  const [tree, newest] = await Promise.all([catalog.tree(), catalog.newest(12)]);
  if (tree.kind !== 'ok') throw new CatalogUnavailableError();

  return (
    <main>
      <h1>Computer hardware</h1>
      <h2>Categories</h2>
      {tree.data.items.length === 0 ? (
        <p>No categories yet.</p>
      ) : (
        <div className="home-categories">
          {tree.data.items.map((c) => (
            <a key={c.id} href={`/c/${c.slug}`} data-slug={c.slug}>
              {c.name}
              <small>
                {c.productCount} {c.productCount === 1 ? 'product' : 'products'}
              </small>
            </a>
          ))}
        </div>
      )}
      {newest.kind === 'ok' && newest.data.items.length > 0 ? (
        <>
          <h2>New in</h2>
          <ProductGrid items={newest.data.items} />
        </>
      ) : null}
    </main>
  );
}

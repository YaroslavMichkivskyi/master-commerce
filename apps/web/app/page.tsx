import type { Metadata } from 'next';
import { ProductGrid } from '../components/shop/product-card';
import { ChevronRightIcon } from '../components/ui/icons';
import { CatalogUnavailableError, catalog } from '../lib/catalog';
import { productCount } from '../lib/listing';

export const metadata: Metadata = { alternates: { canonical: '/' } };

// Rendered per request, never at build time: a build has no catalog to ask, and a home
// page frozen as "unavailable" must not be served. The tree is still cached for 5 minutes
// in the data cache (lib/catalog.ts).
export const dynamic = 'force-dynamic';

/** Home: the top categories and the newest products (TASK-6 FR-030, FR-010). */
export default async function HomePage() {
  const [tree, newest] = await Promise.all([catalog.tree(), catalog.newest(12)]);
  if (tree.kind !== 'ok') throw new CatalogUnavailableError();

  return (
    <div className="flex flex-col gap-10 md:gap-14">
      <section className="flex flex-col gap-3 pt-2 md:pt-6">
        <span aria-hidden="true" className="h-1 w-16 rounded-pill bg-accent-gradient" />
        <h1 className="text-3xl font-bold tracking-tight text-text md:text-5xl">
          Computer hardware
        </h1>
        <p className="max-w-2xl text-base text-muted md:text-lg">
          CPUs, graphics cards, storage, peripherals and more. Every price includes VAT.
        </p>
      </section>

      <section aria-labelledby="categories" className="flex flex-col gap-4">
        <h2 id="categories" className="text-xl font-semibold text-text">
          Categories
        </h2>
        {tree.data.items.length === 0 ? (
          <p className="text-muted">No categories yet.</p>
        ) : (
          <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {tree.data.items.map((c) => (
              <li key={c.id}>
                <a
                  href={`/c/${c.slug}`}
                  data-slug={c.slug}
                  className="group flex h-full items-center justify-between gap-3 rounded-lg border border-border bg-surface p-4 text-text no-underline shadow-card transition-colors hover:border-accent"
                >
                  <span className="flex min-w-0 flex-col">
                    <span className="font-semibold wrap-break-word">{c.name}</span>
                    <span className="figures text-sm text-muted">
                      {productCount(c.productCount)}
                    </span>
                  </span>
                  <ChevronRightIcon className="text-muted group-hover:text-accent" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </section>

      {newest.kind === 'ok' && newest.data.items.length > 0 ? (
        <section aria-labelledby="new-in" className="flex flex-col gap-4">
          <h2 id="new-in" className="text-xl font-semibold text-text">
            New in
          </h2>
          <ProductGrid items={newest.data.items} />
        </section>
      ) : null}
    </div>
  );
}

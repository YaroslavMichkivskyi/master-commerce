import type { ProductSpecDto } from '@master-commerce/dto';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { JsonLd } from '../../../components/shop/json-ld';
import { Breadcrumbs } from '../../../components/shop/list-controls';
import { StockBadge } from '../../../components/ui/badge';
import { ImagePlaceholder } from '../../../components/ui/placeholder';
import { Price } from '../../../components/ui/price';
import { CatalogUnavailableError, catalog } from '../../../lib/catalog';
import { euros } from '../../../lib/query';
import { breadcrumbList, clip, noindex, productLd } from '../../../lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

// ISR (ADR 0025): no product is built with the app (a build has no catalog to ask); each
// one is rendered on its first visit, kept and rendered again in the background at most
// every 5 minutes. Statuses stay real: an unknown slug is a 404, an old one a 308.
export const revalidate = 300;
export function generateStaticParams(): { slug: string }[] {
  return [];
}

/** Specs shown above the fold (FR-014); all of them are in the table below. */
const KEY_SPECS = 5;

/** A spec as shown in the table: "12 GB", "Yes", "HDMI 2.1, USB-C". */
function specText(spec: ProductSpecDto): string {
  const v = spec.value;
  const text =
    typeof v === 'boolean' ? (v ? 'Yes' : 'No') : Array.isArray(v) ? v.join(', ') : String(v);
  return spec.unit && typeof v === 'number' ? `${text} ${spec.unit}` : text;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const answer = await catalog.product((await params).slug);
  if (answer.kind === 'unavailable') return noindex('Unavailable');
  if (answer.kind !== 'ok') return {};
  const p = answer.data;
  return {
    title: p.name,
    description: clip(
      `${p.name} by ${p.brand.name}, ${euros(p.priceCents)} with VAT. ${p.description}`,
    ),
    alternates: { canonical: `/p/${p.slug}` },
  };
}

/** A product page, complete server-rendered HTML (FR-033, AC #2). */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  // The layout's category tree (the same request, one per render): this page is kept for
  // 5 minutes, so it fails rather than be kept without its menu — a failed background
  // re-render leaves the last whole page in place.
  const [answer, tree] = await Promise.all([catalog.product(slug), catalog.tree()]);
  if (tree.kind === 'unavailable') throw new CatalogUnavailableError();
  if (answer.kind === 'not-found' || answer.kind === 'invalid') notFound();
  if (answer.kind === 'unavailable') throw new CatalogUnavailableError();
  const p = answer.data;
  if (p.slug !== slug) permanentRedirect(`/p/${p.slug}`);

  const trail = [
    { name: 'Home', path: '/' },
    ...p.category.path.map((c) => ({ name: c.name, path: `/c/${c.slug}` })),
    { name: p.category.name, path: `/c/${p.category.slug}` },
    { name: p.name, path: `/p/${p.slug}` },
  ];
  const key = p.specs.slice(0, KEY_SPECS);
  return (
    <>
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbList(trail)} />
      <div className="mb-6">
        <Breadcrumbs
          trail={trail.map((c, i) =>
            i < trail.length - 1 ? { name: c.name, href: c.path } : { name: c.name },
          )}
        />
      </div>

      {/* Above the fold on desktop (FR-014): the image place, then the facts to decide on. */}
      <div className="grid gap-6 md:grid-cols-2 md:gap-10 lg:grid-cols-5">
        <ImagePlaceholder ratio="1/1" className="lg:col-span-2" />
        <div className="flex flex-col gap-4 lg:col-span-3">
          <h1 className="text-2xl font-bold tracking-tight text-text wrap-break-word md:text-3xl">
            {p.name}
          </h1>
          <p className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted">
            <a
              href={`/brands/${p.brand.slug}`}
              className="inline-flex min-h-6 items-center font-semibold"
            >
              {p.brand.name}
            </a>
            <span>
              SKU: <span className="figures">{p.sku}</span>
            </span>
          </p>
          <div className="flex flex-wrap items-end gap-4 rounded-lg border border-border bg-surface p-4">
            <Price cents={p.priceCents} size="lg" vatNote />
            <StockBadge inStock={p.inStock} />
          </div>
          {key.length > 0 ? (
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              {key.map((s) => (
                <div key={s.code} className="flex flex-col">
                  <dt className="text-muted">{s.name}</dt>
                  <dd className="font-medium text-text wrap-break-word">{specText(s)}</dd>
                </div>
              ))}
            </dl>
          ) : null}
        </div>
      </div>

      <div className="mt-10 grid gap-10 lg:grid-cols-5">
        <section aria-labelledby="description" className="flex flex-col gap-3 lg:col-span-2">
          <h2 id="description" className="text-xl font-semibold text-text">
            Description
          </h2>
          <p className="text-text">{p.description}</p>
        </section>
        <section aria-labelledby="specs" className="flex flex-col gap-3 lg:col-span-3">
          <h2 id="specs" className="text-xl font-semibold text-text">
            Specifications
          </h2>
          <table className="w-full border-collapse overflow-hidden rounded-lg text-sm">
            <tbody>
              {p.specs.map((s) => (
                <tr key={s.code} className="border-b border-border last:border-b-0 odd:bg-surface">
                  <th scope="row" className="w-2/5 px-3 py-2 text-left font-normal text-muted">
                    {s.name}
                  </th>
                  <td className="px-3 py-2 text-text wrap-break-word">{specText(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </>
  );
}

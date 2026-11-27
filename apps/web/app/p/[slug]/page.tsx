import type { ProductSpecDto } from '@master-commerce/dto';
import type { Metadata } from 'next';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs, JsonLd, StockBadge } from '../../../components/storefront';
import { CatalogUnavailableError, catalog } from '../../../lib/catalog';
import { euros } from '../../../lib/query';
import { breadcrumbList, clip, noindex, productLd } from '../../../lib/seo';

interface Props {
  params: Promise<{ slug: string }>;
}

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
  const answer = await catalog.product(slug);
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
  return (
    <main>
      <JsonLd data={productLd(p)} />
      <JsonLd data={breadcrumbList(trail)} />
      <Breadcrumbs
        trail={trail.map((c, i) =>
          i < trail.length - 1 ? { name: c.name, href: c.path } : { name: c.name },
        )}
      />
      <h1>{p.name}</h1>
      <div className="product">
        <section>
          <p>{p.description}</p>
          <h2>Specifications</h2>
          <table className="specs">
            <tbody>
              {p.specs.map((s) => (
                <tr key={s.code}>
                  <th scope="row">{s.name}</th>
                  <td>{specText(s)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
        <aside className="buy">
          <span className="price">{euros(p.priceCents)}</span>
          <small>VAT included</small>
          <StockBadge inStock={p.inStock} />
          <div>
            Brand: <a href={`/brands/${p.brand.slug}`}>{p.brand.name}</a>
          </div>
          <div>SKU: {p.sku}</div>
        </aside>
      </div>
    </main>
  );
}

import type { ProductSpecDto } from '@master-commerce/dto';
import { notFound, permanentRedirect } from 'next/navigation';
import { Breadcrumbs, StockBadge, Unavailable } from '../../../components/storefront';
import { catalog } from '../../../lib/catalog';
import { euros } from '../../../lib/query';

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

/** A product page, complete server-rendered HTML (FR-033, AC #2). */
export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const answer = await catalog.product(slug);
  if (answer.kind === 'not-found' || answer.kind === 'invalid') notFound();
  if (answer.kind === 'unavailable') {
    return (
      <main>
        <Unavailable />
      </main>
    );
  }
  const p = answer.data;
  if (p.slug !== slug) permanentRedirect(`/p/${p.slug}`);

  return (
    <main>
      <Breadcrumbs
        trail={[
          { name: 'Home', href: '/' },
          ...p.category.path.map((c) => ({ name: c.name, href: `/c/${c.slug}` })),
          { name: p.category.name, href: `/c/${p.category.slug}` },
          { name: p.name },
        ]}
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

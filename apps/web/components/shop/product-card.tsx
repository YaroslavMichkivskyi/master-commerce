import type { ProductCardDto } from '@master-commerce/dto';
import { StockBadge } from '../ui/badge';
import { ImagePlaceholder } from '../ui/placeholder';
import { Price } from '../ui/price';

// A product card and the grid of them (FR-003, edge cases). The whole card is the link to
// the product (its name link stretched over it); the brand link sits above that. A long
// name is cut to two lines, the full one is in `title`; the price and the stock badge stay
// at the bottom, so the cards of a row are of one height.

export function ProductCard({ card }: { card: ProductCardDto }) {
  return (
    <article
      data-slug={card.slug}
      className="relative flex h-full flex-col gap-3 rounded-lg border border-border bg-surface p-3 shadow-card md:p-4 transition-colors hover:border-accent"
    >
      <ImagePlaceholder ratio="4/3" />
      <h3 className="text-base leading-snug font-semibold">
        <a
          href={`/p/${card.slug}`}
          title={card.name}
          className="line-clamp-2 text-text no-underline wrap-break-word after:absolute after:inset-0 after:rounded-lg"
        >
          {card.name}
        </a>
      </h3>
      <a
        href={`/brands/${card.brand.slug}`}
        className="relative z-10 self-start text-sm text-muted no-underline hover:text-accent"
      >
        {card.brand.name}
      </a>
      {card.highlights.length > 0 ? (
        <dl className="flex flex-col gap-0.5 text-sm text-muted">
          {card.highlights.map((h) => (
            <div key={h.name} className="flex gap-1">
              <dt className="shrink-0">{h.name}:</dt>
              <dd className="truncate text-text">{h.value}</dd>
            </div>
          ))}
        </dl>
      ) : null}
      <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-1">
        <Price cents={card.priceCents} />
        <StockBadge inStock={card.inStock} />
      </div>
    </article>
  );
}

export function ProductGrid({ items }: { items: readonly ProductCardDto[] }) {
  return (
    <ul className="grid grid-cols-2 gap-3 md:gap-4 lg:grid-cols-3 xl:grid-cols-4">
      {items.map((card) => (
        <li key={card.id}>
          <ProductCard card={card} />
        </li>
      ))}
    </ul>
  );
}

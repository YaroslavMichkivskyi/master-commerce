import type { ReactNode } from 'react';
import { formatCount } from '../../lib/listing';
import { type Crumb, Breadcrumbs } from './list-controls';

// The top of a page (FR-010): breadcrumbs, the one `h1`, an optional line under it.

export function PageHead({
  trail,
  title,
  children,
}: {
  trail?: readonly Crumb[];
  title: ReactNode;
  children?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3">
      {trail ? <Breadcrumbs trail={trail} /> : null}
      <h1 className="text-2xl font-bold tracking-tight text-text wrap-break-word md:text-3xl">
        {title}
      </h1>
      {children}
    </div>
  );
}

/** Links to categories as pills: subcategories of a category, suggestions of a search. */
export function CategoryPills({
  items,
  label,
}: {
  items: readonly { slug: string; name: string; productCount?: number }[];
  label: string;
}) {
  if (items.length === 0) return null;
  return (
    <ul aria-label={label} className="flex flex-wrap gap-2">
      {items.map((c) => (
        <li key={c.slug}>
          <a
            href={`/c/${c.slug}`}
            className="inline-flex min-h-8 items-center gap-2 rounded-pill border border-border bg-surface px-3 py-1 text-sm text-text no-underline hover:border-accent hover:text-accent"
          >
            {c.name}
            {c.productCount !== undefined ? (
              <span className="figures text-xs text-muted">{formatCount(c.productCount)}</span>
            ) : null}
          </a>
        </li>
      ))}
    </ul>
  );
}

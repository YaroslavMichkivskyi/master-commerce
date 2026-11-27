import type { ReactNode } from 'react';
import { ButtonLink } from '../ui/button';
import { BoxIcon, FilterIcon, SearchIcon } from '../ui/icons';

// The designed states of a page (FR-003, US-3): empty, unavailable, not found. Each says
// what happened and offers a way on, never bare text. No loading state: pages are sent
// whole, never streamed, so their HTTP status is true (ADR 0025).

export function StatePanel({
  icon,
  title,
  children,
  actions,
  alert = false,
  heading = 'h2',
}: {
  icon: ReactNode;
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
  /** An error the visitor must notice: announced at once. */
  alert?: boolean;
  /** `h1` when the state is the whole page (not found, error). */
  heading?: 'h1' | 'h2';
}) {
  const Heading = heading;
  return (
    <section
      role={alert ? 'alert' : undefined}
      className="mx-auto flex max-w-md flex-col items-center gap-3 rounded-lg border border-border bg-surface px-6 py-10 text-center"
    >
      <span className="flex size-12 items-center justify-center rounded-pill bg-accent-soft text-accent">
        {icon}
      </span>
      <Heading className="text-lg font-semibold text-text">{title}</Heading>
      {children ? <div className="text-sm text-muted">{children}</div> : null}
      {actions ? <div className="mt-2 flex flex-wrap justify-center gap-2">{actions}</div> : null}
    </section>
  );
}

/** A list the filters emptied: the way on is to remove them. */
export function NoResults({ clearHref, filtered }: { clearHref: string; filtered: boolean }) {
  return (
    <StatePanel
      icon={<FilterIcon />}
      title={filtered ? 'No products match these filters' : 'No products here yet'}
      actions={
        filtered ? (
          <ButtonLink href={clearHref} variant="secondary">
            Clear all filters
          </ButtonLink>
        ) : (
          <ButtonLink href="/" variant="secondary">
            Browse the categories
          </ButtonLink>
        )
      }
    >
      {filtered ? 'Remove a filter or two to see more.' : null}
    </StatePanel>
  );
}

/**
 * A search that found nothing, or nothing searched yet: the whole page (its `h1`), with
 * the categories to go on from (`suggestions`, left out while the catalog is down).
 */
export function NothingFound({ query, suggestions }: { query: string; suggestions?: ReactNode }) {
  return (
    <StatePanel
      heading="h1"
      icon={<SearchIcon />}
      title={query ? `Nothing found for “${query}”` : 'Search'}
      actions={suggestions}
    >
      {query
        ? 'Check the spelling, use fewer words, or browse the categories:'
        : 'Type what you are looking for above, or browse the categories:'}
    </StatePanel>
  );
}

/** The catalog did not answer (a 5xx); `retry` is the error page's button. */
export function Unavailable({ retry }: { retry?: ReactNode }) {
  return (
    <StatePanel
      alert
      heading="h1"
      icon={<BoxIcon />}
      title="The catalog is unavailable right now"
      actions={retry}
    >
      Please try again in a moment.
    </StatePanel>
  );
}

/** A page or product that does not exist (a 404). */
export function NotFoundState() {
  return (
    <StatePanel
      heading="h1"
      icon={<SearchIcon />}
      title="Page not found"
      actions={
        <ButtonLink href="/" variant="secondary">
          Browse the categories
        </ButtonLink>
      }
    >
      The page does not exist or the product is no longer sold. Search above or start from the
      categories.
    </StatePanel>
  );
}

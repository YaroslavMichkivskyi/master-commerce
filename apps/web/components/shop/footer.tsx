import type { StorefrontCategoryNodeDto } from '@master-commerce/dto';
import { Logo } from './header';

// The site footer (FR-003): the top categories again for people who scrolled to the end,
// and the VAT note that applies to every price.

export function SiteFooter({ tree }: { tree: readonly StorefrontCategoryNodeDto[] }) {
  return (
    <footer className="mt-16 border-t border-border bg-surface">
      <div className="mx-auto flex max-w-page flex-col gap-6 px-4 py-8 md:flex-row md:justify-between">
        <div className="flex flex-col gap-2">
          <Logo />
          <p className="text-sm text-muted">Computer hardware. All prices include VAT.</p>
        </div>
        {tree.length > 0 ? (
          <nav aria-label="Categories">
            <ul className="grid grid-cols-2 gap-x-8 gap-y-1 sm:grid-cols-3">
              {tree.map((c) => (
                <li key={c.id}>
                  <a
                    href={`/c/${c.slug}`}
                    className="inline-flex min-h-6 items-center text-sm text-muted no-underline hover:text-accent"
                  >
                    {c.name}
                  </a>
                </li>
              ))}
            </ul>
          </nav>
        ) : null}
      </div>
    </footer>
  );
}

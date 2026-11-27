import type { StorefrontCategoryNodeDto } from '@master-commerce/dto';
import { CloseIcon, MenuIcon } from '../ui/icons';

// The "Catalog" mega-menu (FR-007, R-6): a native <details>, so it opens and closes without
// JavaScript; two levels of links from the category tree the layout already has. Full
// screen on phones (its button moves to the corner and closes it), a panel under the
// header from 768 px. `MenuEnhancer` adds Escape and outside click.

export function MegaMenu({ tree }: { tree: readonly StorefrontCategoryNodeDto[] }) {
  return (
    <details data-menu className="group">
      <summary className="z-50 inline-flex h-10 items-center gap-2 rounded-md px-3 text-sm font-semibold text-text hover:bg-surface-2 group-open:fixed group-open:top-3 group-open:right-4 group-open:bg-surface md:group-open:static">
        <MenuIcon className="group-open:hidden" />
        <CloseIcon className="hidden group-open:block" />
        <span className="group-open:hidden">Catalog</span>
        <span className="hidden group-open:inline">Close</span>
      </summary>
      <div className="fixed inset-0 z-40 overflow-y-auto bg-surface pt-16 md:absolute md:inset-x-0 md:top-full md:bottom-auto md:max-h-screen md:border-b md:border-border md:pt-0 md:shadow-pop">
        <nav aria-label="Catalog" className="mx-auto max-w-page p-4 md:p-6">
          <ul className="grid gap-x-6 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
            {tree.map((top) => (
              <li key={top.id}>
                <a
                  href={`/c/${top.slug}`}
                  className="flex items-baseline justify-between gap-2 font-semibold text-text no-underline hover:text-accent"
                >
                  {top.name}
                  <span className="figures text-xs font-normal text-muted">{top.productCount}</span>
                </a>
                {top.children.length > 0 ? (
                  <ul className="mt-2 flex flex-col gap-1 border-l border-border pl-3">
                    {top.children.map((child) => (
                      <li key={child.id}>
                        <a
                          href={`/c/${child.slug}`}
                          className="inline-flex min-h-6 items-center text-sm text-muted no-underline hover:text-accent"
                        >
                          {child.name}
                        </a>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </li>
            ))}
          </ul>
        </nav>
      </div>
    </details>
  );
}

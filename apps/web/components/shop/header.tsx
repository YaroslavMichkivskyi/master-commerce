import type { StorefrontCategoryNodeDto } from '@master-commerce/dto';
import { Button } from '../ui/button';
import { SearchIcon } from '../ui/icons';
import { Input } from '../ui/input';
import { MegaMenu } from './mega-menu';
import { ThemeSwitch } from './theme-switch';

// The site header (FR-003, FR-007, US-3): a skip link, the logo, the catalog menu, the
// search form (GET /search, works without JavaScript) and the theme switch. One row from
// 768 px; on phones the search takes a second row.

export function Logo() {
  return (
    <a
      href="/"
      className="flex items-center gap-2 text-base font-bold text-text no-underline md:text-lg"
    >
      <span aria-hidden="true" className="size-7 rounded-md bg-accent-gradient" />
      <span>
        master-<span className="text-accent">commerce</span>
      </span>
    </a>
  );
}

export function SearchForm() {
  return (
    // One focus ring around the field and its button together (the field's own ring would
    // run under the button).
    <form
      method="get"
      action="/search"
      role="search"
      className="flex w-full rounded-md focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-focus"
    >
      <Input
        type="search"
        name="q"
        placeholder="Search products"
        aria-label="Search products"
        maxLength={200}
        className="rounded-r-none focus-visible:outline-none"
      />
      <Button
        type="submit"
        size="icon"
        className="rounded-l-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-on-accent focus-visible:ring-inset"
        aria-label="Search"
      >
        <SearchIcon />
      </Button>
    </form>
  );
}

export function SiteHeader({ tree }: { tree: readonly StorefrontCategoryNodeDto[] }) {
  return (
    <header className="sticky top-0 z-30 border-b border-border bg-surface">
      <a
        href="#main"
        className="sr-only rounded-md bg-accent px-3 py-2 text-on-accent focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50"
      >
        Skip to content
      </a>
      <div className="mx-auto flex max-w-page flex-wrap items-center gap-x-2 gap-y-2 px-4 py-3 md:gap-x-4">
        <Logo />
        <div className="ml-auto md:ml-0">
          <MegaMenu tree={tree} />
        </div>
        <div className="order-last w-full md:order-none md:w-auto md:flex-1">
          <SearchForm />
        </div>
        <ThemeSwitch />
      </div>
    </header>
  );
}

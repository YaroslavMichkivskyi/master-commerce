import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { catalog } from '../lib/catalog';
import './globals.css';

export const metadata: Metadata = {
  title: { default: 'master-commerce — computer hardware', template: '%s — master-commerce' },
  description: 'CPUs, graphics cards, storage, peripherals, laptops and more.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tree = await catalog.tree();
  const top = tree.kind === 'ok' ? tree.data.items : [];
  return (
    <html lang="en">
      <body>
        <header className="site">
          <a href="/" className="logo">
            master-commerce
          </a>
          <form method="get" action="/search" role="search" className="search">
            <input
              type="search"
              name="q"
              placeholder="Search products"
              aria-label="Search products"
              maxLength={200}
            />
            <button type="submit">Search</button>
          </form>
          <nav aria-label="Categories" className="top">
            {top.map((c) => (
              <a key={c.id} href={`/c/${c.slug}`}>
                {c.name}
              </a>
            ))}
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}

import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { SiteFooter } from '../components/shop/footer';
import { SiteHeader } from '../components/shop/header';
import { MenuEnhancer } from '../components/shop/menu-enhancer';
import { catalog } from '../lib/catalog';
import { siteUrl } from '../lib/seo';
import { themeScript } from '../lib/theme';
import { inter } from './fonts';
import './globals.css';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl()),
  title: { default: 'master-commerce — computer hardware', template: '%s — master-commerce' },
  description: 'CPUs, graphics cards, storage, peripherals, laptops and more.',
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const tree = await catalog.tree();
  const top = tree.kind === 'ok' ? tree.data.items : [];
  return (
    // The theme script sets `data-theme` before React hydrates (R-3).
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="flex flex-col">
        <SiteHeader tree={top} />
        {/* The one <main> of every page, the skip link's target; a page brings its content. */}
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-page flex-1 px-4 py-6 outline-none md:py-8"
        >
          {children}
        </main>
        <SiteFooter tree={top} />
        <MenuEnhancer />
      </body>
    </html>
  );
}

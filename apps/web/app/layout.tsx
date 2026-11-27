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
// The TASK-6 styles until the pages are rebuilt (specs/036-web-design, phase 6).
import './legacy.css';

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
        {/* The skip link's target; the pages bring their own <main> until phase 6. */}
        <div id="main" tabIndex={-1} className="flex-1 outline-none">
          {children}
        </div>
        <SiteFooter tree={top} />
        <MenuEnhancer />
      </body>
    </html>
  );
}

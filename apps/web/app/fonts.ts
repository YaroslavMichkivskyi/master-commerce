import localFont from 'next/font/local';

// Inter variable, self-hosted (specs/036-web-design R-4): the Latin weight axis from
// Fontsource, preloaded, `swap` with Next's size-adjusted fallback (no layout shift), and no
// request to a font service at build or run time.
export const inter = localFont({
  src: '../node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2',
  weight: '100 900',
  style: 'normal',
  display: 'swap',
  variable: '--font-inter',
  fallback: ['ui-sans-serif', 'system-ui', 'sans-serif'],
});

import type { MetadataRoute } from 'next';
import { absolute } from '../lib/seo';

// robots.txt: everything but search is crawlable; filtered lists stay crawlable so their
// `noindex, follow` is seen (FR-040, FR-042).
// Per request, so SITE_URL of the running app is used, not the one of the build.
export const dynamic = 'force-dynamic';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/', disallow: '/search' },
    sitemap: absolute('/sitemap.xml'),
  };
}

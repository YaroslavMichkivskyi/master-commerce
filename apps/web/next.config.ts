import type { NextConfig } from 'next';

const config: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  experimental: {
    // ISR pages and the data cache live only in Next's in-memory LRU (`cacheMaxMemorySize`,
    // 50 MB by default), never on disk: every address renders a cache entry, a 404 too, so
    // a crawl of made-up `/p/<slug>` or `/c/<slug>` addresses would grow a disk cache
    // without end. The cost: a restart starts with an empty cache (ADR 0025).
    isrFlushToDisk: false,
  },
};

export default config;

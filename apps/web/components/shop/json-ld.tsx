import { jsonLd } from '../../lib/seo';

/** Structured data for search engines, escaped by `jsonLd` (TASK-6 FR-041). */
export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(data) }} />;
}

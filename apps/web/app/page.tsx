import { fetchCategories } from '../lib/gateway';

// Rendered per request for now; ISR with on-demand revalidation comes with TASK-6 / TASK-18.
export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const result = await fetchCategories();

  return (
    <main>
      <h1>Computer hardware</h1>
      <h2>Categories</h2>
      {result.kind === 'unavailable' ? (
        <p role="alert">The catalog is unavailable right now. Please try again later.</p>
      ) : result.items.length === 0 ? (
        <p>No categories yet.</p>
      ) : (
        <ul>
          {result.items.map((c) => (
            <li key={c.id} data-slug={c.slug}>
              {c.name}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}

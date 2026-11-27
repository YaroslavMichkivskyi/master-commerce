'use client';

import { Unavailable } from '../components/storefront';

// A page that could not be rendered — the catalog unavailable (CatalogUnavailableError) or
// anything unexpected: a 5xx with the "unavailable" message, never a stack trace (TASK-6
// edge cases, TASK-2 behaviour).
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main>
      <Unavailable />
      <button type="button" onClick={reset}>
        Try again
      </button>
    </main>
  );
}

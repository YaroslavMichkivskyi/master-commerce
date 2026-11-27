'use client';

import { useRouter } from 'next/navigation';
import { startTransition } from 'react';
import { Unavailable } from '../components/shop/states';
import { Button } from '../components/ui/button';

// A page that could not be rendered — the catalog unavailable (CatalogUnavailableError) or
// anything unexpected: a 5xx with the "unavailable" message, never a stack trace (TASK-6
// edge cases, TASK-2 behaviour).
export default function ErrorPage({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const router = useRouter();
  // The page is a server component: its data is fetched again only by a refresh.
  const retry = () =>
    startTransition(() => {
      router.refresh();
      reset();
    });
  return (
    <Unavailable
      retry={
        <Button type="button" onClick={retry}>
          Try again
        </Button>
      }
    />
  );
}

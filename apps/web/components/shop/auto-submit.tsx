'use client';

import { useEffect } from 'react';

// Submits the form of a `<select data-auto-submit>` as soon as an option is picked (the sort
// control). Without JavaScript the form keeps its "Apply" button, rendered in <noscript>.

export function AutoSubmit() {
  useEffect(() => {
    const onChange = (e: Event) => {
      const select = e.target as Element | null;
      if (select instanceof HTMLSelectElement && select.hasAttribute('data-auto-submit')) {
        select.form?.requestSubmit();
      }
    };
    document.addEventListener('change', onChange);
    return () => document.removeEventListener('change', onChange);
  }, []);

  return null;
}

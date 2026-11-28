'use client';

import { useEffect } from 'react';

// Upgrades the `<details data-menu>` menus when JavaScript runs (FR-007, R-6): `Escape`
// closes the open one and returns focus to its button, a click outside or on a link inside
// closes it. Without JavaScript the menus still open and close by their summary.

export function MenuEnhancer() {
  useEffect(() => {
    const open = () => [
      ...document.querySelectorAll<HTMLDetailsElement>('details[data-menu][open]'),
    ];

    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      for (const menu of open()) {
        menu.open = false;
        menu.querySelector('summary')?.focus();
      }
    };
    const onClick = (e: MouseEvent) => {
      const target = e.target as Element | null;
      for (const menu of open()) {
        const inside = target !== null && menu.contains(target);
        if (!inside || target.closest('a')) menu.open = false;
      }
    };

    document.addEventListener('keydown', onKey);
    document.addEventListener('click', onClick);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('click', onClick);
    };
  }, []);

  return null;
}

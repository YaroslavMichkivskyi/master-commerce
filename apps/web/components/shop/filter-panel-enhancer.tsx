'use client';

import { useEffect } from 'react';

// Makes the phone filter panel modal when JavaScript runs (FR-012, US-4, R-6). Without
// JavaScript the panel is the overlay a <details> opens and closes. With it, while the panel
// is open everything else on the page is `inert` (focus and screen readers stay inside), the
// panel is announced as a modal dialog and gets the focus, `Escape` or "Show N products"
// closes it and the focus goes back to the "Filters" button. The panel stays where the
// server rendered it: nothing React owns is moved.

const DESKTOP = '(min-width: 48rem)';

export function FilterPanelEnhancer() {
  useEffect(() => {
    const toggle = document.querySelector<HTMLDetailsElement>('details[data-filter-toggle]');
    const panel = document.getElementById('filters');
    const summary = toggle?.querySelector('summary');
    if (!toggle || !panel || !summary) return;

    let inert: Element[] = [];
    const release = () => {
      for (const el of inert) el.removeAttribute('inert');
      inert = [];
      panel.removeAttribute('role');
      panel.removeAttribute('aria-modal');
      document.documentElement.classList.remove('overflow-hidden');
    };
    const hold = () => {
      // Every branch of the page beside the path to the panel and its button.
      for (let node = panel.parentElement; node && node !== document.body;) {
        const parent: HTMLElement | null = node.parentElement;
        for (const sibling of parent?.children ?? []) {
          if (sibling === node || sibling.contains(toggle) || sibling.hasAttribute('inert'))
            continue;
          sibling.setAttribute('inert', '');
          inert.push(sibling);
        }
        node = parent;
      }
      panel.setAttribute('role', 'dialog');
      panel.setAttribute('aria-modal', 'true');
      document.documentElement.classList.add('overflow-hidden');
      panel.focus();
    };
    const close = () => {
      toggle.open = false;
      summary.focus();
    };

    const onToggle = () => (toggle.open ? hold() : release());
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && toggle.open) close();
    };
    const onClick = (e: MouseEvent) => {
      // "Show N products" points at the list already shown: just close the panel.
      if ((e.target as Element | null)?.closest('[data-close-filters]')) {
        e.preventDefault();
        close();
      }
    };
    const wide = window.matchMedia(DESKTOP);
    const onWide = () => {
      if (wide.matches && toggle.open) toggle.open = false;
    };

    toggle.addEventListener('toggle', onToggle);
    document.addEventListener('keydown', onKey);
    panel.addEventListener('click', onClick);
    wide.addEventListener('change', onWide);
    return () => {
      toggle.removeEventListener('toggle', onToggle);
      document.removeEventListener('keydown', onKey);
      panel.removeEventListener('click', onClick);
      wide.removeEventListener('change', onWide);
      release();
    };
  }, []);

  return null;
}

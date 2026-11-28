'use client';

import { useEffect } from 'react';

// Applies a `<select data-auto-submit>` (the sort control) as soon as an option is picked
// with the pointer. From the keyboard, arrow keys on a closed select change its value at
// once in most browsers; submitting then would leave the page on the first step (WCAG
// 3.2.2). So a keyboard change is applied by Enter, or when the focus leaves the select.
// Without JavaScript the form keeps its "Apply" button, rendered in <noscript>.

type Mode = 'pointer' | 'keyboard';

const target = (e: Event) =>
  e.target instanceof Element
    ? e.target.closest<HTMLSelectElement>('select[data-auto-submit]')
    : null;

/** The value the page was rendered with. */
const initial = (select: HTMLSelectElement) =>
  [...select.options].find((o) => o.defaultSelected)?.value ?? select.options[0]?.value;

const submitIfChanged = (select: HTMLSelectElement) => {
  if (select.value !== initial(select)) select.form?.requestSubmit();
};

export function AutoSubmit() {
  useEffect(() => {
    const mode = new WeakMap<HTMLSelectElement, Mode>();

    const onPointer = (e: Event) => {
      const select = target(e);
      if (select) mode.set(select, 'pointer');
    };
    const onKey = (e: KeyboardEvent) => {
      const select = target(e);
      if (!select) return;
      mode.set(select, 'keyboard');
      if (e.key === 'Enter' && select.value !== initial(select)) {
        e.preventDefault();
        select.form?.requestSubmit();
      }
    };
    const onChange = (e: Event) => {
      const select = target(e);
      // A pick with the pointer, or a change no key caused, applies at once.
      if (select && mode.get(select) !== 'keyboard') submitIfChanged(select);
    };
    const onLeave = (e: Event) => {
      const select = target(e);
      if (select && mode.get(select) === 'keyboard') submitIfChanged(select);
    };

    document.addEventListener('pointerdown', onPointer, true);
    document.addEventListener('keydown', onKey, true);
    document.addEventListener('change', onChange);
    document.addEventListener('focusout', onLeave);
    return () => {
      document.removeEventListener('pointerdown', onPointer, true);
      document.removeEventListener('keydown', onKey, true);
      document.removeEventListener('change', onChange);
      document.removeEventListener('focusout', onLeave);
    };
  }, []);

  return null;
}

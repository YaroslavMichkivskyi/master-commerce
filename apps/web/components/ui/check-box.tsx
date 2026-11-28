import { cx } from './cx';
import { CheckIcon } from './icons';

// The box of a filter value (FR-003). Filter values are links (every state has an address,
// TASK-6), so the box only shows the state; the link says it in words for assistive
// technology (`selected` below).

export function CheckBox({ checked }: { checked: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex size-5 shrink-0 items-center justify-center rounded-sm border',
        checked ? 'border-accent bg-accent text-on-accent' : 'border-border-strong bg-surface',
      )}
    >
      {checked ? <CheckIcon className="size-3.5" /> : null}
    </span>
  );
}

/** Words for a selected filter value, read by screen readers only. */
export function Selected({ checked }: { checked: boolean }) {
  return checked ? <span className="sr-only"> (selected)</span> : null;
}

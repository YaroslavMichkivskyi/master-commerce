import type { ReactNode } from 'react';
import { cx } from './cx';
import { CheckIcon, CloseIcon } from './icons';

// Badges (FR-003). State is never told by colour alone: the stock badge has a word and an
// icon (FR-020).

export type Tone = 'neutral' | 'accent' | 'success' | 'danger';

const TONES: Record<Tone, string> = {
  neutral: 'bg-surface-2 text-muted',
  accent: 'bg-accent-soft text-accent',
  success: 'bg-success-soft text-success',
  danger: 'bg-danger-soft text-danger',
};

export function Badge({
  tone = 'neutral',
  className,
  children,
}: {
  tone?: Tone;
  className?: string;
  children: ReactNode;
}) {
  return (
    <span
      className={cx(
        'inline-flex items-center gap-1 rounded-pill px-2 py-0.5 text-xs font-semibold',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function StockBadge({ inStock }: { inStock: boolean }) {
  return inStock ? (
    <Badge tone="success">
      <CheckIcon className="size-3.5" />
      In stock
    </Badge>
  ) : (
    <Badge tone="danger">
      <CloseIcon className="size-3.5" />
      Out of stock
    </Badge>
  );
}

/** A number on a button or a filter: how many are applied or found. */
export function CountBadge({ count, label }: { count: number; label: string }) {
  return (
    <Badge tone="accent" className="figures">
      {count}
      <span className="sr-only"> {label}</span>
    </Badge>
  );
}

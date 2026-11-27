import type { InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from 'react';
import { cx } from './cx';
import { ChevronDownIcon } from './icons';

// Text, number and select fields (FR-003, FR-020). A field always has a name for assistive
// technology: a visible <label> through `label`, or `aria-label`.

const FIELD =
  'h-10 w-full rounded-md border border-border-strong bg-surface px-3 text-base text-text ' +
  'placeholder:text-muted disabled:cursor-not-allowed disabled:opacity-50';

type Props = InputHTMLAttributes<HTMLInputElement> & { label?: ReactNode };

export function Input({ label, className, ...rest }: Props) {
  const input = <input className={cx(FIELD, className)} {...rest} />;
  return label ? (
    <label className="flex flex-col gap-1 text-sm font-medium text-text">
      {label}
      {input}
    </label>
  ) : (
    input
  );
}

/**
 * A drop-down of fixed options (the sort control): our own arrow instead of the browser's,
 * a pointer, and — where the browser can style it (`.select` in globals.css) — a list that
 * looks like the field; elsewhere the list is the system one.
 */
export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <span className="relative inline-flex">
      <select
        className={cx(
          FIELD,
          // `appearance` is set by `.select` in globals.css (a utility would override the
          // customizable list there).
          'select w-auto cursor-pointer py-0 pr-9 hover:border-accent',
          className,
        )}
        {...rest}
      />
      <ChevronDownIcon className="pointer-events-none absolute top-1/2 right-3 size-4 -translate-y-1/2 text-muted" />
    </span>
  );
}

/** A number field: `step="any"`, a decimal keypad on phones, figures of one width. */
export function NumberInput({ className, ...rest }: Omit<Props, 'type'>) {
  return (
    <Input
      type="number"
      inputMode="decimal"
      step="any"
      className={cx('figures', className)}
      {...rest}
    />
  );
}

/**
 * A from / to pair of a range filter: `<code>.min` and `<code>.max`, the address keys of
 * TASK-6. The surrounding GET form and its "Apply" button belong to the filter.
 */
export function RangeFields({
  code,
  unit,
  min,
  max,
  placeholderMin,
  placeholderMax,
}: {
  code: string;
  unit?: string;
  min?: string;
  max?: string;
  placeholderMin?: string;
  placeholderMax?: string;
}) {
  const suffix = unit ? ` (${unit})` : '';
  return (
    <div className="grid grid-cols-2 gap-2">
      <NumberInput
        label={`From${suffix}`}
        name={`${code}.min`}
        defaultValue={min}
        placeholder={placeholderMin}
      />
      <NumberInput
        label={`To${suffix}`}
        name={`${code}.max`}
        defaultValue={max}
        placeholder={placeholderMax}
      />
    </div>
  );
}

import { euros } from '../../lib/query';
import { cx } from './cx';

// A price in euros, VAT included (FR-003): figures of one width so prices line up in a
// grid, the note "incl. VAT" where the price is the main fact (the product page).

const SIZES = { sm: 'text-base', md: 'text-lg', lg: 'text-3xl' } as const;

export function Price({
  cents,
  size = 'md',
  vatNote = false,
  className,
}: {
  cents: number;
  size?: keyof typeof SIZES;
  vatNote?: boolean;
  className?: string;
}) {
  return (
    <span className={cx('inline-flex flex-col', className)}>
      <span className={cx('figures font-bold text-text', SIZES[size])}>{euros(cents)}</span>
      {vatNote ? <span className="text-xs text-muted">incl. VAT</span> : null}
    </span>
  );
}

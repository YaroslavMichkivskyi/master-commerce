import { cx } from './cx';
import { BoxIcon } from './icons';

// A shape that keeps the layout still (research R-7): an image place of a fixed ratio, so
// a photo arriving later (TASK-16) moves nothing. No loading skeletons: pages are never
// streamed (ADR 0025, docs/web-guidelines.md).

const RATIOS = { '4/3': 'aspect-4/3', '1/1': 'aspect-square' } as const;

/** Where a product photo goes: 4:3 on cards, 1:1 on the product page. Decorative. */
export function ImagePlaceholder({
  ratio = '4/3',
  className,
}: {
  ratio?: keyof typeof RATIOS;
  className?: string;
}) {
  return (
    <div
      aria-hidden="true"
      className={cx(
        'flex w-full items-center justify-center rounded-md bg-surface-2 text-border-strong',
        RATIOS[ratio],
        className,
      )}
    >
      <BoxIcon className="size-1/4" />
    </div>
  );
}

import type { AnchorHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { cx } from './cx';

// Buttons (FR-003). A <button> for actions and form submits, a link that looks like one
// for navigation; both from the same classes. Every size is at least 32 px high, above the
// 24 px minimum target (FR-020).

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg' | 'icon';

const VARIANTS: Record<ButtonVariant, string> = {
  primary: 'bg-accent text-on-accent hover:bg-accent-hover',
  secondary: 'border border-border-strong bg-surface text-text hover:bg-surface-2',
  ghost: 'text-text hover:bg-surface-2',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-6 text-base',
  icon: 'size-10',
};

export function buttonClass(variant: ButtonVariant = 'primary', size: ButtonSize = 'md') {
  return cx(
    'inline-flex items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap no-underline',
    'transition-colors disabled:cursor-not-allowed disabled:opacity-50',
    VARIANTS[variant],
    SIZES[size],
  );
}

interface Look {
  variant?: ButtonVariant;
  size?: ButtonSize;
}

export function Button({
  variant,
  size,
  className,
  type = 'button',
  ...rest
}: Look & ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type={type} className={cx(buttonClass(variant, size), className)} {...rest} />;
}

export function ButtonLink({
  variant,
  size,
  className,
  ...rest
}: Look & AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  return <a className={cx(buttonClass(variant, size), className)} {...rest} />;
}

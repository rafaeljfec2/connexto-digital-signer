import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--th-badge-default-bg)] text-[var(--th-badge-default-text)]',
  success: 'bg-[var(--th-badge-default-bg)] text-accent',
  warning: 'bg-[var(--th-badge-default-bg)] text-warning',
  danger: 'bg-[var(--th-badge-default-bg)] text-error',
  info: 'bg-[var(--th-badge-default-bg)] text-primary',
};

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: Readonly<BadgeProps>) {
  const base =
    'inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-medium tracking-wide';
  return (
    <span className={`${base} ${variantStyles[variant]} ${className}`} {...props} />
  );
}

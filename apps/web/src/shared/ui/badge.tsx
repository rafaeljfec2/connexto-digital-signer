import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-[var(--th-badge-default-bg)] text-[var(--th-badge-default-text)] border border-[var(--th-badge-default-border)]',
  success: 'bg-success/15 text-success border border-success/20',
  warning: 'bg-warning/15 text-warning border border-warning/20',
  danger: 'bg-error/15 text-error border border-error/20',
  info: 'bg-accent-400/15 text-accent-400 border border-accent-400/20',
};

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: Readonly<BadgeProps>) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium tracking-wide';
  return (
    <span className={`${base} ${variantStyles[variant]} ${className}`} {...props} />
  );
}

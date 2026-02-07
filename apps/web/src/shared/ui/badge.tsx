import type { HTMLAttributes } from 'react';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info';

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  readonly variant?: BadgeVariant;
};

const variantStyles: Record<BadgeVariant, string> = {
  default: 'bg-neutral-100/80 text-neutral-700 border border-white/30',
  success: 'bg-success/15 text-success border border-success/20',
  warning: 'bg-warning/15 text-warning border border-warning/20',
  danger: 'bg-error/15 text-error border border-error/20',
  info: 'bg-brand-300/20 text-brand-300 border border-brand-300/30',
};

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: Readonly<BadgeProps>) {
  const base =
    'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide';
  return (
    <span className={`${base} ${variantStyles[variant]} ${className}`} {...props} />
  );
}

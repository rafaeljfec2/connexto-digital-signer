import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'ghost';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
}

const getVariantClass = (variant: ButtonVariant): string => {
  if (variant === 'ghost') {
    return 'bg-transparent text-primary border border-border hover:bg-surface';
  }
  return 'bg-primary text-primary-foreground hover:opacity-95';
};

export function Button({
  variant = 'primary',
  className = '',
  ...props
}: Readonly<ButtonProps>) {
  const base =
    'inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none';
  const variantClass = getVariantClass(variant);
  return <button className={`${base} ${variantClass} ${className}`} {...props} />;
}

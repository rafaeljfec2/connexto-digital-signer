import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly isLoading?: boolean;
}

const getVariantClass = (variant: ButtonVariant): string => {
  if (variant === 'ghost') {
    return 'bg-transparent text-brand-300 border border-white/20 hover:bg-white/10';
  }
  if (variant === 'secondary') {
    return 'bg-transparent text-brand-300 border border-brand-300/50 hover:bg-brand-300/10';
  }
  if (variant === 'destructive') {
    return 'bg-error text-white hover:bg-error/90';
  }
  return 'bg-gradient-cta text-white shadow-lg shadow-brand-900/25 hover:shadow-brand-900/40';
};

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  ...props
}: Readonly<ButtonProps>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none';
  const variantClass = getVariantClass(variant);
  const isDisabled = Boolean(props.disabled) || isLoading;
  return (
    <button
      className={`${base} ${variantClass} ${className}`}
      {...props}
      disabled={isDisabled}
      aria-busy={isLoading}
    >
      {isLoading ? (
        <span className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
      ) : null}
      {props.children}
    </button>
  );
}

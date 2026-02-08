import type { ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'destructive';

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  readonly variant?: ButtonVariant;
  readonly isLoading?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  primary: 'btn-primary-themed',
  secondary: [
    'bg-white text-foreground border border-th-card-border',
    'hover:bg-th-hover',
    'dark:bg-white/10',
  ].join(' '),
  ghost: [
    'bg-transparent text-foreground border border-th-input-border',
    'hover:bg-th-hover',
  ].join(' '),
  destructive: [
    'bg-error text-white',
    'hover:opacity-90',
  ].join(' '),
};

export function Button({
  variant = 'primary',
  isLoading = false,
  className = '',
  ...props
}: Readonly<ButtonProps>) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-normal transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-40 disabled:pointer-events-none';
  const variantClass = VARIANT_CLASSES[variant];
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

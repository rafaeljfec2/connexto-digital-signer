import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export function Input({ className = '', ...props }: Readonly<InputProps>) {
  const base =
    'w-full rounded-md border border-border bg-surface px-3 py-2 text-sm text-text placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2';
  return <input className={`${base} ${className}`} {...props} />;
}

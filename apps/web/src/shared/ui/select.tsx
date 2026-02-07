import type { SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export function Select({ className = '', ...props }: Readonly<SelectProps>) {
  const base =
    'w-full rounded-lg border border-white/30 bg-white/70 px-3 py-2 text-sm text-neutral-900 backdrop-blur-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70';
  return <select className={`${base} ${className}`} {...props} />;
}

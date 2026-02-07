import { forwardRef } from 'react';
import type { InputHTMLAttributes } from 'react';

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className = '', ...props },
  ref
) {
  const base =
    'w-full rounded-lg border border-white/20 bg-white/10 px-3 py-2 text-sm text-white placeholder:text-neutral-100/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/70';
  return <input ref={ref} className={`${base} ${className}`} {...props} />;
});

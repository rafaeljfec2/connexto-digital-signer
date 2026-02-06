import type { HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement>;

export function Card({ className = '', ...props }: Readonly<CardProps>) {
  const base = 'rounded-xl bg-surface shadow-lg border border-border';
  return <div className={`${base} ${className}`} {...props} />;
}

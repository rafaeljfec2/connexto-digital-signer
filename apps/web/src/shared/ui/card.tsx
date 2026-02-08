import type { HTMLAttributes } from 'react';

type CardVariant = 'default' | 'glass';

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly variant?: CardVariant;
}

const getVariantClass = (variant: CardVariant): string => {
  if (variant === 'glass') {
    return 'glass-card';
  }
  return 'rounded-xl bg-th-card border border-th-card-border shadow-th-card';
};

export function Card({
  className = '',
  variant = 'default',
  ...props
}: Readonly<CardProps>) {
  const base = 'rounded-xl';
  const variantClass = getVariantClass(variant);
  return <div className={`${base} ${variantClass} ${className}`} {...props} />;
}

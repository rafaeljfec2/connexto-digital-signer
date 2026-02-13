import { forwardRef, type HTMLAttributes } from 'react';

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

export const Card = forwardRef<HTMLDivElement, Readonly<CardProps>>(
  function Card({ className = '', variant = 'default', ...props }, ref) {
    const base = 'rounded-xl';
    const variantClass = getVariantClass(variant);
    return <div ref={ref} className={`${base} ${variantClass} ${className}`} {...props} />;
  },
);

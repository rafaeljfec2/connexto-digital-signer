import type { HTMLAttributes } from 'react';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

export function Skeleton({ className = '', ...props }: Readonly<SkeletonProps>) {
  const base = 'animate-pulse rounded-md bg-th-hover';
  return <div className={`${base} ${className}`} {...props} />;
}

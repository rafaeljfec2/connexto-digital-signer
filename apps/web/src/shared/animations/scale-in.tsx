"use client";

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type ScaleInProps = Readonly<{
  children: ReactNode;
  delay?: number;
  className?: string;
  bounce?: boolean;
}>;

export function ScaleIn({
  children,
  delay = 0,
  className,
  bounce = false,
}: ScaleInProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.5 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={
        bounce
          ? { type: 'spring', stiffness: 300, damping: 20, delay }
          : { duration: 0.35, delay, ease: [0.25, 0.1, 0.25, 1] }
      }
      className={className}
    >
      {children}
    </motion.div>
  );
}

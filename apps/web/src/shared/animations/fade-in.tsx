"use client";

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type FadeDirection = 'up' | 'down' | 'left' | 'right' | 'none';

type FadeInProps = Readonly<{
  children: ReactNode;
  delay?: number;
  duration?: number;
  direction?: FadeDirection;
  distance?: number;
  className?: string;
}>;

const OFFSET: Record<FadeDirection, { x: number; y: number }> = {
  up: { x: 0, y: 16 },
  down: { x: 0, y: -16 },
  left: { x: 16, y: 0 },
  right: { x: -16, y: 0 },
  none: { x: 0, y: 0 },
};

export function FadeIn({
  children,
  delay = 0,
  duration = 0.4,
  direction = 'up',
  distance,
  className,
}: FadeInProps) {
  const prefersReduced = useReducedMotion();
  const offset = OFFSET[direction];
  const dist = distance ?? 1;

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, x: offset.x * dist, y: offset.y * dist }}
      animate={{ opacity: 1, x: 0, y: 0 }}
      transition={{ duration, delay, ease: [0.25, 0.1, 0.25, 1] }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

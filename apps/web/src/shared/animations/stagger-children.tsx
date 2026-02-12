"use client";

import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type StaggerChildrenProps = Readonly<{
  children: ReactNode;
  staggerDelay?: number;
  duration?: number;
  className?: string;
}>;

export function StaggerChildren({
  children,
  staggerDelay = 0.08,
  duration = 0.35,
  className,
}: StaggerChildrenProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: staggerDelay } },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function StaggerItem({
  children,
  className,
  duration = 0.35,
}: Readonly<{
  children: ReactNode;
  className?: string;
  duration?: number;
}>) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: {
          opacity: 1,
          y: 0,
          transition: { duration, ease: [0.25, 0.1, 0.25, 1] },
        },
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

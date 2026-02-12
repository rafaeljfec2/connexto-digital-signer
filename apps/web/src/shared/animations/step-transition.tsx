"use client";

import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type StepTransitionProps = Readonly<{
  stepKey: string;
  direction: 1 | -1;
  children: ReactNode;
  className?: string;
}>;

const SLIDE_DISTANCE = 60;

export function StepTransition({
  stepKey,
  direction,
  children,
  className,
}: StepTransitionProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return (
      <div key={stepKey} className={className}>
        {children}
      </div>
    );
  }

  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        initial="enter"
        animate="center"
        exit="exit"
        variants={{
          enter: (dir: number) => ({
            x: dir * SLIDE_DISTANCE,
            opacity: 0,
          }),
          center: { x: 0, opacity: 1 },
          exit: (dir: number) => ({
            x: dir * -SLIDE_DISTANCE,
            opacity: 0,
          }),
        }}
        transition={{ duration: 0.3, ease: [0.25, 0.1, 0.25, 1] }}
        className={className}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

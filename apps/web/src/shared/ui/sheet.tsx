"use client";

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export type SheetProps = Readonly<{
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
}>;

export function Sheet({ open, title, children, onClose }: SheetProps) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex justify-end">
          <motion.button
            type="button"
            className="absolute inset-0 bg-th-overlay backdrop-blur-sm"
            onClick={onClose}
            initial={prefersReduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative z-10 flex h-full w-full max-w-md flex-col border-l border-th-card-border bg-th-dialog text-foreground shadow-2xl backdrop-blur-xl sm:max-w-lg"
            initial={prefersReduced ? undefined : { x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', stiffness: 400, damping: 35 }}
          >
            {title ? (
              <div className="flex items-center justify-between border-b border-th-card-border px-6 py-4">
                <h3 className="text-lg font-medium">{title}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-lg p-1.5 text-foreground-muted transition-colors hover:bg-th-hover hover:text-foreground"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            ) : null}
            <div className="flex-1 overflow-y-auto px-6 py-4">{children}</div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

"use client";

import type { ReactNode } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { X } from 'lucide-react';

export type DialogProps = Readonly<{
  open: boolean;
  title?: string;
  children: ReactNode;
  onClose: () => void;
  footer?: ReactNode;
}>;

export function Dialog({
  open,
  title,
  children,
  onClose,
  footer,
}: DialogProps) {
  const prefersReduced = useReducedMotion();

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
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
            className="relative z-10 w-full max-w-lg rounded-2xl border border-th-card-border bg-th-dialog p-6 text-foreground shadow-2xl backdrop-blur-xl"
            initial={prefersReduced ? undefined : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex items-start justify-between gap-4">
              {title ? <h3 className="text-lg font-medium">{title}</h3> : null}
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-lg p-1 text-foreground-muted transition-colors hover:bg-th-hover hover:text-foreground"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>
            <div className="mt-3 text-sm text-foreground-muted">{children}</div>
            {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

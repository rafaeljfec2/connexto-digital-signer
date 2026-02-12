"use client";

import { AlertTriangle } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { Button } from './button';

export type ConfirmDialogProps = Readonly<{
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  isLoading?: boolean;
  variant?: 'danger' | 'warning';
  onConfirm: () => void;
  onCancel: () => void;
}>;

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  cancelLabel,
  isLoading = false,
  variant = 'danger',
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  const prefersReduced = useReducedMotion();
  const iconBg = variant === 'danger' ? 'bg-error/20' : 'bg-warning/20';
  const iconColor = variant === 'danger' ? 'text-error' : 'text-warning';

  return (
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <motion.button
            type="button"
            className="absolute inset-0 bg-th-overlay backdrop-blur-sm"
            onClick={onCancel}
            disabled={isLoading}
            initial={prefersReduced ? undefined : { opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
          />
          <motion.div
            className="relative z-10 w-full max-w-sm rounded-2xl border border-th-card-border bg-th-dialog p-6 text-foreground shadow-2xl backdrop-blur-xl"
            initial={prefersReduced ? undefined : { opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 30 }}
          >
            <div className="flex flex-col items-center gap-4 text-center">
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
                <AlertTriangle className={`h-6 w-6 ${iconColor}`} />
              </div>
              <div className="space-y-1.5">
                <h3 className="text-base font-medium">{title}</h3>
                <p className="text-sm leading-relaxed text-foreground-muted">{description}</p>
              </div>
            </div>
            <div className="mt-6 flex gap-3">
              <Button
                type="button"
                variant="ghost"
                className="flex-1"
                onClick={onCancel}
                disabled={isLoading}
              >
                {cancelLabel}
              </Button>
              <Button
                type="button"
                variant="primary"
                className="flex-1 bg-error hover:bg-error/80"
                onClick={onConfirm}
                isLoading={isLoading}
              >
                {confirmLabel}
              </Button>
            </div>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>
  );
}

"use client";

import type { ReactNode } from 'react';

export type DialogProps = {
  readonly open: boolean;
  readonly title?: string;
  readonly children: ReactNode;
  readonly onClose: () => void;
  readonly footer?: ReactNode;
};

export function Dialog({
  open,
  title,
  children,
  onClose,
  footer,
}: Readonly<DialogProps>) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-surface p-6 shadow-lg">
        {title ? <h3 className="text-base font-semibold text-text">{title}</h3> : null}
        <div className="mt-3 text-sm text-text">{children}</div>
        {footer ? <div className="mt-5 flex justify-end gap-2">{footer}</div> : null}
      </div>
    </div>
  );
}

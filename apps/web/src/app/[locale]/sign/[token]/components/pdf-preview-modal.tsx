"use client";

import dynamic from 'next/dynamic';
import { X } from 'lucide-react';
import type { SignerField } from '@/features/signing/api';

const SignerPdfViewer = dynamic(
  () => import('../signer-pdf-viewer').then((mod) => mod.SignerPdfViewer),
  { ssr: false, loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
    </div>
  )}
);

type PdfPreviewModalProps = Readonly<{
  open: boolean;
  fileUrl: string;
  fields: SignerField[];
  fieldValues: Record<string, string>;
  onClose: () => void;
  labels: Readonly<{
    title: string;
    clickToSign: string;
    clickToInitials: string;
  }>;
}>;

export function PdfPreviewModal({
  open,
  fileUrl,
  fields,
  fieldValues,
  onClose,
  labels,
}: PdfPreviewModalProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black/80 backdrop-blur-md">
      <div className="flex shrink-0 items-center justify-between border-b border-th-border bg-th-dialog px-4 py-2.5 md:px-6">
        <h2 className="text-sm font-medium text-foreground">{labels.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-th-border text-foreground-muted transition hover:bg-th-hover hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col">
        <SignerPdfViewer
          fileUrl={fileUrl}
          fields={fields}
          fieldValues={fieldValues}
          onFieldClick={() => undefined}
          disabled
          labels={{
            clickToSign: labels.clickToSign,
            clickToInitials: labels.clickToInitials,
          }}
        />
      </div>
    </div>
  );
}

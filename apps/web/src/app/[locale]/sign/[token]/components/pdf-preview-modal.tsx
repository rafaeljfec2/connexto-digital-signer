"use client";

import { X } from 'lucide-react';
import { SignerPdfViewer } from '../signer-pdf-viewer';
import type { SignerField } from '@/features/signing/api';

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
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 bg-brand-900 px-4 py-2.5 md:px-6">
        <h2 className="text-sm font-semibold text-white">{labels.title}</h2>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg border border-white/20 text-white/70 transition hover:bg-white/10 hover:text-white"
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

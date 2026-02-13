"use client";

import { useEffect, useMemo, useState } from 'react';
import { X } from 'lucide-react';
import type { SignerField } from '@/features/signing/api';
import { useSignerPdf } from '@/features/signing/hooks';
import { DocumentTabs } from '@/shared/ui';
import { lazyLoad } from '@/shared/utils/lazy-load';

const SignerPdfViewer = lazyLoad(
  () => import('../signer-pdf-viewer'),
  'SignerPdfViewer',
  { minHeight: '40vh' },
);

type DocumentItem = {
  readonly id: string;
  readonly title: string;
};

type PdfPreviewModalProps = Readonly<{
  open: boolean;
  token: string;
  documents: ReadonlyArray<DocumentItem>;
  fields: ReadonlyArray<SignerField>;
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
  token,
  documents,
  fields,
  fieldValues,
  onClose,
  labels,
}: PdfPreviewModalProps) {
  const [selectedDocId, setSelectedDocId] = useState(
    () => documents[0]?.id ?? '',
  );

  useEffect(() => {
    if (open && documents.length > 0 && selectedDocId === '') {
      setSelectedDocId(documents[0].id);
    }
  }, [open, documents, selectedDocId]);

  const pdfQuery = useSignerPdf(
    open ? token : '',
    selectedDocId,
  );

  const fileUrl = useMemo(() => {
    if (!pdfQuery.data) return '';
    return URL.createObjectURL(pdfQuery.data);
  }, [pdfQuery.data]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const selectedFields = useMemo(
    () =>
      selectedDocId
        ? fields.filter((f) => f.documentId === selectedDocId)
        : [],
    [fields, selectedDocId],
  );

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

      {documents.length > 1 ? (
        <div className="shrink-0 border-b border-th-border bg-th-dialog px-4 py-1.5">
          <DocumentTabs
            documents={documents}
            selectedId={selectedDocId}
            onSelect={setSelectedDocId}
            size="sm"
          />
        </div>
      ) : null}

      <div className="flex min-h-0 flex-1 flex-col">
        {fileUrl ? (
          <SignerPdfViewer
            fileUrl={fileUrl}
            fields={selectedFields as SignerField[]}
            fieldValues={fieldValues}
            onFieldClick={() => undefined}
            disabled
            labels={{
              clickToSign: labels.clickToSign,
              clickToInitials: labels.clickToInitials,
            }}
          />
        ) : (
          <div className="flex flex-1 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
          </div>
        )}
      </div>
    </div>
  );
}

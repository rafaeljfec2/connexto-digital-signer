import { useCallback, useMemo, useRef, useState } from 'react';

import { Button } from '@/shared/ui';

import { usePdfDocument } from '../hooks/use-pdf-document';
import { usePdfEngine } from '../hooks/use-pdf-engine';
import { SignatureFieldData, SignatureFieldType } from '../types';
import { PdfPage } from './PdfPage';
import { SignatureField } from './SignatureField';

type PdfViewerProps = Readonly<{
  fileUrl: string;
  fields: SignatureFieldData[];
  signerColors: Record<string, string>;
  getFieldLabel: (type: SignatureFieldType) => string;
  onRemoveField?: (id: string) => void;
  onPageContainerReady?: (pageNumber: number, element: HTMLDivElement | null) => void;
}>;

const clampScale = (value: number) => Math.min(2.5, Math.max(0.5, value));

export const PdfViewer = ({
  fileUrl,
  fields,
  signerColors,
  getFieldLabel,
  onRemoveField,
  onPageContainerReady,
}: PdfViewerProps) => {
  const { pdfjsLib, isReady, error } = usePdfEngine();
  const { pdfDocument, pageCount, isLoading, error: documentError } = usePdfDocument({
    pdfjsLib,
    fileUrl,
  });
  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const currentPageFields = useMemo(
    () => fields.filter((field) => field.page === currentPage),
    [fields, currentPage]
  );

  const handleZoomIn = () => setScale((current) => clampScale(current + 0.15));
  const handleZoomOut = () => setScale((current) => clampScale(current - 0.15));

  const handleFitToWidth = useCallback(() => {
    if (!scrollContainerRef.current || !pdfDocument) {
      return;
    }
    const containerWidth = scrollContainerRef.current.clientWidth - 32;
    pdfDocument.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const nextScale = containerWidth / viewport.width;
      setScale(clampScale(nextScale));
    });
  }, [pdfDocument, currentPage]);

  const handlePrevPage = () => setCurrentPage((p) => Math.max(1, p - 1));
  const handleNextPage = () => setCurrentPage((p) => Math.min(pageCount, p + 1));

  if (error) {
    return <div className="p-4 text-sm text-danger">{error}</div>;
  }

  if (!isReady || isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-muted">Loading PDF...</div>
      </div>
    );
  }

  if (documentError) {
    return <div className="p-4 text-sm text-danger">{documentError}</div>;
  }

  if (!pdfDocument) {
    return null;
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface px-3 py-2">
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 p-0 text-lg">
            −
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-muted">
            {Math.round(scale * 100)}%
          </span>
          <Button type="button" variant="ghost" onClick={handleZoomIn} className="h-8 w-8 p-0 text-lg">
            +
          </Button>
          <Button type="button" variant="ghost" onClick={handleFitToWidth} className="h-8 px-2 text-xs">
            Fit
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={handlePrevPage}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0 text-sm"
          >
            ‹
          </Button>
          <span className="min-w-[4rem] text-center text-xs text-muted">
            {currentPage} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={handleNextPage}
            disabled={currentPage >= pageCount}
            className="h-8 w-8 p-0 text-sm"
          >
            ›
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-auto bg-neutral-100 p-4"
        style={{ maxHeight: 'calc(100vh - 280px)' }}
      >
        <PdfPage
          key={currentPage}
          pdfDocument={pdfDocument}
          pageNumber={currentPage}
          scale={scale}
          fields={currentPageFields}
          onContainerReady={onPageContainerReady}
          renderField={(field) => (
            <SignatureField
              field={field}
              label={getFieldLabel(field.type)}
              color={signerColors[field.signerId] ?? '#4F46E5'}
              onRemove={onRemoveField}
            />
          )}
        />
      </div>
    </div>
  );
};

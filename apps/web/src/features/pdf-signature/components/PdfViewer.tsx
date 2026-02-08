import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { Button } from '@/shared/ui';

import { usePdfDocument } from '../hooks/use-pdf-document';
import { usePdfEngine } from '../hooks/use-pdf-engine';
import { FieldPreview, SignatureFieldData, SignatureFieldType } from '../types';
import { PdfPage } from './PdfPage';
import { SignatureField } from './SignatureField';

type PdfViewerProps = Readonly<{
  fileUrl: string;
  fields: SignatureFieldData[];
  signerColors: Record<string, string>;
  getFieldLabel: (type: SignatureFieldType) => string;
  getSignerName?: (signerId: string) => string;
  onRemoveField?: (id: string) => void;
  onPageContainerReady?: (pageNumber: number, element: HTMLDivElement | null) => void;
  selectedFieldId?: string;
  onSelectField?: (id: string) => void;
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
  fieldPreview?: FieldPreview;
  fillContainer?: boolean;
}>;

const clampScale = (value: number) => Math.min(2.5, Math.max(0.5, value));

export const PdfViewer = ({
  fileUrl,
  fields,
  signerColors,
  getFieldLabel,
  getSignerName,
  onRemoveField,
  onPageContainerReady,
  selectedFieldId,
  onSelectField,
  onPageClick,
  fieldPreview,
  fillContainer = false,
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
    <div className={`flex flex-col ${fillContainer ? 'h-full overflow-hidden' : ''}`}>
      <div className={`flex shrink-0 flex-wrap items-center justify-between gap-2 px-3 py-2 ${
        fillContainer
          ? 'border-b border-th-border bg-th-header text-foreground'
          : 'border-b border-th-border bg-th-card'
      }`}>
        <div className="flex items-center gap-1">
          <Button type="button" variant="ghost" onClick={handleZoomOut} className="h-8 w-8 p-0 text-lg">
            −
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-foreground-muted">
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
          <span className="min-w-[4rem] text-center text-xs text-foreground-muted">
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

      <div className={`flex gap-3 bg-th-hover p-3 ${fillContainer ? 'min-h-0 flex-1 overflow-hidden' : ''}`}>
        <div className="hidden w-24 flex-col gap-2 overflow-y-auto rounded-xl border border-th-border bg-th-card p-2 md:flex">
          {Array.from({ length: pageCount }).map((_, index) => {
            const pageNumber = index + 1;
            return (
              <PdfThumbnail
                key={`thumb-${pageNumber}`}
                pdfDocument={pdfDocument}
                pageNumber={pageNumber}
                isActive={pageNumber === currentPage}
                onSelect={() => setCurrentPage(pageNumber)}
              />
            );
          })}
        </div>
        <div
          ref={scrollContainerRef}
          className="flex-1 overflow-auto rounded-xl bg-white/80 p-4"
          style={fillContainer ? undefined : { maxHeight: 'calc(100vh - 320px)' }}
        >
          <PdfPage
            key={currentPage}
            pdfDocument={pdfDocument}
            pageNumber={currentPage}
            scale={scale}
            fields={currentPageFields}
            onContainerReady={onPageContainerReady}
            onPageClick={onPageClick}
            fieldPreview={fieldPreview}
            renderField={(field) => (
              <SignatureField
                field={field}
                label={getFieldLabel(field.type)}
                signerName={getSignerName?.(field.signerId) ?? ''}
                color={signerColors[field.signerId] ?? '#4F46E5'}
                onRemove={onRemoveField}
                onSelect={onSelectField}
                isSelected={selectedFieldId === field.id}
              />
            )}
          />
        </div>
      </div>
    </div>
  );
};

type PdfThumbnailProps = Readonly<{
  pdfDocument: PdfDocument;
  pageNumber: number;
  isActive: boolean;
  onSelect: () => void;
}>;

const PdfThumbnail = ({ pdfDocument, pageNumber, isActive, onSelect }: PdfThumbnailProps) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    let isActiveRender = true;
    pdfDocument
      .getPage(pageNumber)
      .then((page) => {
        if (!isActiveRender) return;
        const viewport = page.getViewport({ scale: 0.2 });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        return page.render({ canvasContext: context, viewport }).promise;
      })
      .catch(() => undefined);
    return () => {
      isActiveRender = false;
    };
  }, [pdfDocument, pageNumber]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`rounded-lg border p-1 transition ${
        isActive ? 'border-accent-400 bg-th-active' : 'border-th-border bg-th-hover'
      }`}
    >
      <canvas ref={canvasRef} className="block h-auto w-full rounded-md" />
    </button>
  );
};

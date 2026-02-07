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

const clampScale = (value: number) => Math.min(2.5, Math.max(0.6, value));

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
  const containerRef = useRef<HTMLDivElement | null>(null);

  const fieldsByPage = useMemo(() => {
    const map = new Map<number, SignatureFieldData[]>();
    fields.forEach((field) => {
      const list = map.get(field.page) ?? [];
      list.push(field);
      map.set(field.page, list);
    });
    return map;
  }, [fields]);

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, index) => index + 1),
    [pageCount]
  );

  const handleZoomIn = () => setScale((current) => clampScale(current + 0.1));
  const handleZoomOut = () => setScale((current) => clampScale(current - 0.1));

  const handleFitToWidth = useCallback(() => {
    if (!containerRef.current || !pdfDocument) {
      return;
    }
    const containerWidth = containerRef.current.clientWidth;
    pdfDocument.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const nextScale = containerWidth / viewport.width;
      setScale(clampScale(nextScale));
    });
  }, [pdfDocument]);

  if (error) {
    return <div className="p-4 text-sm text-danger">{error}</div>;
  }

  if (!isReady || isLoading) {
    return <div className="p-4 text-sm text-muted">Loading PDF...</div>;
  }

  if (documentError) {
    return <div className="p-4 text-sm text-danger">{documentError}</div>;
  }

  if (!pdfDocument) {
    return null;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button type="button" variant="ghost" onClick={handleZoomOut}>
          -
        </Button>
        <Button type="button" variant="ghost" onClick={handleZoomIn}>
          +
        </Button>
        <Button type="button" variant="ghost" onClick={handleFitToWidth}>
          Fit
        </Button>
        <span className="text-xs text-muted">
          {pageCount} {pageCount === 1 ? 'page' : 'pages'}
        </span>
      </div>
      <div ref={containerRef} className="space-y-6">
        {pages.map((pageNumber) => (
          <PdfPage
            key={pageNumber}
            pdfDocument={pdfDocument}
            pageNumber={pageNumber}
            scale={scale}
            fields={fieldsByPage.get(pageNumber) ?? []}
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
        ))}
      </div>
    </div>
  );
};

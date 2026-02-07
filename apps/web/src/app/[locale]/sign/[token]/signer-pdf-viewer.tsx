"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PenTool, Fingerprint, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { usePdfEngine } from '@/features/pdf-signature/hooks/use-pdf-engine';
import { usePdfDocument } from '@/features/pdf-signature/hooks/use-pdf-document';
import { Button } from '@/shared/ui';
import type { SignerField } from '@/features/signing/api';
import type { PdfDocument } from '@/features/pdf-signature/types';

type SignerPdfViewerProps = Readonly<{
  fileUrl: string;
  fields: SignerField[];
  fieldValues: Record<string, string>;
  onFieldClick: (fieldId: string) => void;
  disabled?: boolean;
  labels: Readonly<{
    clickToSign: string;
    clickToInitials: string;
  }>;
}>;

const MIN_SCALE = 0.3;
const MAX_SCALE = 3;
const DEFAULT_DESKTOP_SCALE = 1.4;
const DEFAULT_MOBILE_SCALE = 0.75;
const MOBILE_BREAKPOINT = 768;
const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

type PageRendererProps = Readonly<{
  pdfDocument: PdfDocument;
  pageNumber: number;
  scale: number;
  fields: SignerField[];
  fieldValues: Record<string, string>;
  onFieldClick: (fieldId: string) => void;
  disabled: boolean;
  labels: Readonly<{
    clickToSign: string;
    clickToInitials: string;
  }>;
}>;

function PageRenderer({
  pdfDocument,
  pageNumber,
  scale,
  fields,
  fieldValues,
  onFieldClick,
  disabled,
  labels,
}: PageRendererProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const renderingRef = useRef(false);
  const queuedScale = useRef<number | null>(null);

  const renderPage = useCallback(
    (renderScale: number) => {
      if (renderingRef.current) {
        queuedScale.current = renderScale;
        return;
      }
      renderingRef.current = true;
      pdfDocument
        .getPage(pageNumber)
        .then((page) => {
          const viewport = page.getViewport({ scale: renderScale });
          const canvas = canvasRef.current;
          const ctx = canvas?.getContext('2d');
          if (!canvas || !ctx) {
            renderingRef.current = false;
            return;
          }
          canvas.width = viewport.width;
          canvas.height = viewport.height;
          setSize({ width: viewport.width, height: viewport.height });
          return page.render({ canvasContext: ctx, viewport }).promise;
        })
        .then(() => {
          renderingRef.current = false;
          const next = queuedScale.current;
          if (next !== null) {
            queuedScale.current = null;
            renderPage(next);
          }
        })
        .catch(() => {
          renderingRef.current = false;
        });
    },
    [pdfDocument, pageNumber]
  );

  useEffect(() => {
    renderPage(scale);
  }, [scale, renderPage]);

  const pageFields = useMemo(
    () => fields.filter((f) => f.page === pageNumber),
    [fields, pageNumber]
  );

  return (
    <div
      className="relative bg-white shadow-sm"
      style={{
        width: size.width || '100%',
        height: size.height || undefined,
      }}
    >
      <canvas ref={canvasRef} className="block" />
      <div className="absolute inset-0">
        {pageFields.map((field) => {
          const value = fieldValues[field.id] ?? field.value ?? '';
          const isFilled = value.length > 0;
          return (
            <button
              key={field.id}
              type="button"
              disabled={disabled}
              onClick={() => onFieldClick(field.id)}
              className={`absolute flex min-h-[36px] min-w-[80px] items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-2 py-1 text-xs font-medium transition ${
                isFilled
                  ? 'border-green-500 bg-green-50/90 text-green-700'
                  : 'border-orange-400 bg-white/80 text-orange-600 hover:bg-orange-50'
              } ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer active:scale-95'}`}
              style={{
                left: `${field.x * 100}%`,
                top: `${field.y * 100}%`,
                width: `${field.width * 100}%`,
                height: `${field.height * 100}%`,
              }}
            >
              {isFilled ? (
                <>
                  <Check className="h-3.5 w-3.5 shrink-0" />
                  {value.startsWith('data:image/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={value}
                      alt="signature"
                      className="h-full max-h-[90%] w-auto object-contain"
                    />
                  ) : (
                    <span className="truncate italic">{value}</span>
                  )}
                </>
              ) : (
                <>
                  {field.type === 'initials' ? (
                    <Fingerprint className="h-3.5 w-3.5 shrink-0" />
                  ) : (
                    <PenTool className="h-3.5 w-3.5 shrink-0" />
                  )}
                  <span className="truncate">
                    {field.type === 'initials'
                      ? labels.clickToInitials
                      : labels.clickToSign}
                  </span>
                </>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export const SignerPdfViewer = ({
  fileUrl,
  fields,
  fieldValues,
  onFieldClick,
  disabled = false,
  labels,
}: SignerPdfViewerProps) => {
  const { pdfjsLib, isReady, error } = usePdfEngine();
  const {
    pdfDocument,
    pageCount,
    isLoading,
    error: docError,
  } = usePdfDocument({ pdfjsLib, fileUrl });

  const [scale, setScale] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);

  const pdfReady = isReady && !isLoading && !!pdfDocument;

  useEffect(() => {
    if (!pdfReady || scale !== null || !pdfDocument) return;
    const container = scrollRef.current;
    if (!container) return;

    pdfDocument.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) {
        setScale(1);
        return;
      }
      const isMobile = containerWidth < MOBILE_BREAKPOINT;
      if (isMobile) {
        setScale(DEFAULT_MOBILE_SCALE);
      } else {
        const fitScale = clampScale(containerWidth / viewport.width);
        setScale(Math.min(fitScale, DEFAULT_DESKTOP_SCALE));
      }
    });
  }, [pdfReady, pdfDocument, scale]);

  const handleFitToWidth = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !pdfDocument) return;
    pdfDocument.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;
      setScale(clampScale(containerWidth / viewport.width));
    });
  }, [pdfDocument]);

  const pages = useMemo(
    () => Array.from({ length: pageCount }, (_, i) => i + 1),
    [pageCount]
  );

  if (error || docError) {
    return <div className="p-4 text-sm text-red-400">{error ?? docError}</div>;
  }

  const showPages = pdfReady && scale !== null && pdfDocument;
  const displayScale = scale ?? 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setScale((s) => clampScale((s ?? 1) - 0.15))}
            disabled={!showPages}
            className="h-7 w-7 p-0"
          >
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="min-w-[2.5rem] text-center text-[10px] text-neutral-100/50">
            {Math.round(displayScale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setScale((s) => clampScale((s ?? 1) + 0.15))}
            disabled={!showPages}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleFitToWidth}
            disabled={!showPages}
            className="h-7 px-1.5 text-[10px]"
          >
            Fit
          </Button>
        </div>
        <span className="text-[10px] text-neutral-100/50">
          {showPages ? `${pageCount} pg` : ''}
        </span>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-neutral-200/60"
      >
        {showPages ? (
          <div className="flex flex-col items-center gap-2 py-2">
            {pages.map((pageNum) => (
              <PageRenderer
                key={pageNum}
                pdfDocument={pdfDocument}
                pageNumber={pageNum}
                scale={displayScale}
                fields={fields}
                fieldValues={fieldValues}
                onFieldClick={onFieldClick}
                disabled={disabled}
                labels={labels}
              />
            ))}
          </div>
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>
    </div>
  );
};

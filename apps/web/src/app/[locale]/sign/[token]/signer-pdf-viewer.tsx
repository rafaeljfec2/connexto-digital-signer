"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PenTool, Fingerprint, Check, ZoomIn, ZoomOut } from 'lucide-react';
import { usePdfEngine } from '@/features/pdf-signature/hooks/use-pdf-engine';
import { usePdfDocument } from '@/features/pdf-signature/hooks/use-pdf-document';
import { Button } from '@/shared/ui';
import type { SignerField } from '@/features/signing/api';

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
const clampScale = (value: number) => Math.min(MAX_SCALE, Math.max(MIN_SCALE, value));

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
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const renderingRef = useRef(false);
  const pendingRenderRef = useRef<{ page: number; scale: number } | null>(null);

  const pdfReady = isReady && !isLoading && !!pdfDocument;

  const doRender = useCallback(
    (pageNum: number, renderScale: number) => {
      if (!pdfDocument) return;
      if (renderingRef.current) {
        pendingRenderRef.current = { page: pageNum, scale: renderScale };
        return;
      }
      renderingRef.current = true;
      pdfDocument
        .getPage(pageNum)
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
          const pending = pendingRenderRef.current;
          if (pending) {
            pendingRenderRef.current = null;
            doRender(pending.page, pending.scale);
          }
        })
        .catch(() => {
          renderingRef.current = false;
        });
    },
    [pdfDocument]
  );

  useEffect(() => {
    if (!pdfReady || scale !== null) return;
    const container = scrollRef.current;
    if (!container) return;

    pdfDocument!.getPage(1).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) {
        setScale(1);
        return;
      }
      setScale(clampScale(containerWidth / viewport.width));
    });
  }, [pdfReady, pdfDocument, scale]);

  useEffect(() => {
    if (scale === null || !pdfDocument) return;
    doRender(currentPage, scale);
  }, [pdfDocument, currentPage, scale, doRender]);

  const handleFitToWidth = useCallback(() => {
    const container = scrollRef.current;
    if (!container || !pdfDocument) return;
    pdfDocument.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
      const containerWidth = container.clientWidth;
      if (containerWidth <= 0) return;
      setScale(clampScale(containerWidth / viewport.width));
    });
  }, [pdfDocument, currentPage]);

  const currentFields = useMemo(
    () => fields.filter((f) => f.page === currentPage),
    [fields, currentPage]
  );

  if (error || docError) {
    return <div className="p-4 text-sm text-red-400">{error ?? docError}</div>;
  }

  const showCanvas = pdfReady && scale !== null;
  const displayScale = scale ?? 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex shrink-0 items-center justify-between border-b border-white/10 px-2 py-1.5">
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setScale((s) => clampScale((s ?? 1) - 0.15))}
            disabled={!showCanvas}
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
            disabled={!showCanvas}
            className="h-7 w-7 p-0"
          >
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleFitToWidth}
            disabled={!showCanvas}
            className="h-7 px-1.5 text-[10px]"
          >
            Fit
          </Button>
        </div>
        <div className="flex items-center gap-0.5">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={!showCanvas || currentPage <= 1}
            className="h-7 w-7 p-0 text-xs"
          >
            ‹
          </Button>
          <span className="min-w-[3rem] text-center text-[10px] text-neutral-100/50">
            {showCanvas ? `${currentPage} / ${pageCount}` : '- / -'}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={!showCanvas || currentPage >= pageCount}
            className="h-7 w-7 p-0 text-xs"
          >
            ›
          </Button>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="min-h-0 flex-1 overflow-auto bg-neutral-100"
      >
        {showCanvas ? (
          <div
            className="relative bg-white"
            style={{
              width: size.width || '100%',
              height: size.height || undefined,
            }}
          >
            <canvas ref={canvasRef} className="block" />
            <div className="absolute inset-0">
              {currentFields.map((field) => {
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
        ) : (
          <div className="flex h-64 items-center justify-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>
    </div>
  );
};

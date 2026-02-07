"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { PenTool, Fingerprint, Check } from 'lucide-react';
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
}>;

const clampScale = (value: number) => Math.min(2.5, Math.max(0.5, value));

export const SignerPdfViewer = ({
  fileUrl,
  fields,
  fieldValues,
  onFieldClick,
  disabled = false,
}: SignerPdfViewerProps) => {
  const { pdfjsLib, isReady, error } = usePdfEngine();
  const {
    pdfDocument,
    pageCount,
    isLoading,
    error: docError,
  } = usePdfDocument({ pdfjsLib, fileUrl });

  const [scale, setScale] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: 0,
    height: 0,
  });

  useEffect(() => {
    if (!pdfDocument) return;
    let active = true;
    pdfDocument
      .getPage(currentPage)
      .then((page) => {
        if (!active) return;
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const ctx = canvas?.getContext('2d');
        if (!canvas || !ctx) return;
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setSize({ width: viewport.width, height: viewport.height });
        return page.render({ canvasContext: ctx, viewport }).promise;
      })
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [pdfDocument, currentPage, scale]);

  const handleFitToWidth = useCallback(() => {
    if (!scrollContainerRef.current || !pdfDocument) return;
    const containerWidth = scrollContainerRef.current.clientWidth - 32;
    pdfDocument.getPage(currentPage).then((page) => {
      const viewport = page.getViewport({ scale: 1 });
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

  if (!isReady || isLoading || !pdfDocument) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-sm text-neutral-100/50">Loading PDF...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setScale((s) => clampScale(s - 0.15))}
            className="h-8 w-8 p-0 text-lg"
          >
            −
          </Button>
          <span className="min-w-[3rem] text-center text-xs text-neutral-100/50">
            {Math.round(scale * 100)}%
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setScale((s) => clampScale(s + 0.15))}
            className="h-8 w-8 p-0 text-lg"
          >
            +
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={handleFitToWidth}
            className="h-8 px-2 text-xs"
          >
            Fit
          </Button>
        </div>
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={currentPage <= 1}
            className="h-8 w-8 p-0 text-sm"
          >
            ‹
          </Button>
          <span className="min-w-[4rem] text-center text-xs text-neutral-100/50">
            {currentPage} / {pageCount}
          </span>
          <Button
            type="button"
            variant="ghost"
            onClick={() => setCurrentPage((p) => Math.min(pageCount, p + 1))}
            disabled={currentPage >= pageCount}
            className="h-8 w-8 p-0 text-sm"
          >
            ›
          </Button>
        </div>
      </div>

      <div
        ref={scrollContainerRef}
        className="overflow-auto rounded-xl bg-white/80 p-4"
        style={{ maxHeight: 'calc(100vh - 320px)' }}
      >
        <div className="flex justify-center">
          <div
            className="relative overflow-hidden rounded-lg bg-white shadow-md"
            style={{
              width: size.width || undefined,
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
                    className={`absolute flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed px-2 py-1 text-xs font-medium transition ${
                      isFilled
                        ? 'border-green-500 bg-green-50/90 text-green-700'
                        : 'border-orange-400 bg-white/80 text-orange-600 hover:bg-orange-50'
                    } ${disabled ? 'cursor-default opacity-60' : 'cursor-pointer'}`}
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
                          {field.type === 'initials' ? 'Rubrica' : 'Assinar'}
                        </span>
                      </>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

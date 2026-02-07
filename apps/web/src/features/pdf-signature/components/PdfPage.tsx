import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { PenTool, Fingerprint } from 'lucide-react';

import { FieldPreview, PdfDocument, SignatureFieldData, SignatureFieldType } from '../types';

const PREVIEW_ICON: Record<SignatureFieldType, React.ReactNode> = {
  signature: <PenTool className="h-3 w-3 shrink-0" />,
  initials: <Fingerprint className="h-3 w-3 shrink-0" />,
  name: <PenTool className="h-3 w-3 shrink-0" />,
  date: <PenTool className="h-3 w-3 shrink-0" />,
  text: <PenTool className="h-3 w-3 shrink-0" />,
};

type PdfPageProps = Readonly<{
  pdfDocument: PdfDocument;
  pageNumber: number;
  scale: number;
  fields: SignatureFieldData[];
  renderField: (field: SignatureFieldData) => React.ReactNode;
  onContainerReady?: (pageNumber: number, element: HTMLDivElement | null) => void;
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
  fieldPreview?: FieldPreview;
}>;

export const PdfPage = ({
  pdfDocument,
  pageNumber,
  scale,
  fields,
  renderField,
  onContainerReady,
  onPageClick,
  fieldPreview,
}: PdfPageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const droppable = useDroppable({ id: `page-${pageNumber}` });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });
  const [previewPos, setPreviewPos] = useState<{ x: number; y: number } | null>(null);

  useEffect(() => {
    if (!onContainerReady) {
      return;
    }
    onContainerReady(pageNumber, containerRef.current);
  }, [onContainerReady, pageNumber]);

  useEffect(() => {
    let isActive = true;

    pdfDocument
      .getPage(pageNumber)
      .then((page) => {
        if (!isActive) {
          return;
        }
        const viewport = page.getViewport({ scale });
        const canvas = canvasRef.current;
        const context = canvas?.getContext('2d');
        if (!canvas || !context) {
          return;
        }
        canvas.width = viewport.width;
        canvas.height = viewport.height;
        setSize({ width: viewport.width, height: viewport.height });
        return page.render({ canvasContext: context, viewport }).promise;
      })
      .catch(() => undefined);

    return () => {
      isActive = false;
    };
  }, [pdfDocument, pageNumber, scale]);

  const handleOverlayClick = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!onPageClick || !containerRef.current) return;
      if ((event.target as HTMLElement).closest('[data-field]')) return;

      const rect = containerRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      onPageClick(pageNumber, x, y);
    },
    [onPageClick, pageNumber]
  );

  const handleMouseMove = useCallback(
    (event: MouseEvent<HTMLDivElement>) => {
      if (!fieldPreview || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = (event.clientX - rect.left) / rect.width;
      const y = (event.clientY - rect.top) / rect.height;
      setPreviewPos({ x, y });
    },
    [fieldPreview]
  );

  const handleMouseLeave = useCallback(() => {
    setPreviewPos(null);
  }, []);

  const previewStyle =
    fieldPreview && previewPos
      ? {
          left: `${(previewPos.x - fieldPreview.width / 2) * 100}%`,
          top: `${(previewPos.y - fieldPreview.height / 2) * 100}%`,
          width: `${fieldPreview.width * 100}%`,
          height: `${fieldPreview.height * 100}%`,
          borderColor: fieldPreview.color,
          color: fieldPreview.color,
        }
      : null;

  return (
    <div className="flex justify-center">
      <div
        ref={(node) => {
          containerRef.current = node;
          droppable.setNodeRef(node);
        }}
        className={`relative overflow-hidden rounded-lg bg-white shadow-md ${
          droppable.isOver ? 'ring-2 ring-primary' : ''
        }`}
        style={{ width: size.width || undefined, height: size.height || undefined }}
      >
        <canvas ref={canvasRef} className="block" />
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions */}
        <div
          className={`absolute inset-0 ${fieldPreview ? 'cursor-crosshair' : ''}`}
          onClick={handleOverlayClick}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {fields.map((field) => (
            <div key={field.id} data-field>{renderField(field)}</div>
          ))}

          {previewStyle ? (
            <div
              className="pointer-events-none absolute flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-white/50 px-2 py-0.5 text-xs shadow-sm"
              style={previewStyle}
            >
              <div className="flex w-full items-center justify-center gap-1 opacity-60">
                {PREVIEW_ICON[fieldPreview!.type]}
                <span className="truncate font-medium">{fieldPreview!.label}</span>
              </div>
              {fieldPreview!.signerName ? (
                <span className="max-w-full truncate text-[9px] leading-tight opacity-40">
                  {fieldPreview!.signerName}
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
};

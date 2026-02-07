import type { MouseEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

import { PdfDocument, SignatureFieldData } from '../types';

type PdfPageProps = Readonly<{
  pdfDocument: PdfDocument;
  pageNumber: number;
  scale: number;
  fields: SignatureFieldData[];
  renderField: (field: SignatureFieldData) => React.ReactNode;
  onContainerReady?: (pageNumber: number, element: HTMLDivElement | null) => void;
  onPageClick?: (pageNumber: number, x: number, y: number) => void;
}>;

export const PdfPage = ({
  pdfDocument,
  pageNumber,
  scale,
  fields,
  renderField,
  onContainerReady,
  onPageClick,
}: PdfPageProps) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const droppable = useDroppable({ id: `page-${pageNumber}` });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [size, setSize] = useState<{ width: number; height: number }>({ width: 0, height: 0 });

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
          className="absolute inset-0"
          onClick={handleOverlayClick}
        >
          {fields.map((field) => (
            <div key={field.id} data-field>{renderField(field)}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

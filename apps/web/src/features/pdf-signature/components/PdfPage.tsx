import { useEffect, useRef, useState } from 'react';
import { useDroppable } from '@dnd-kit/core';

import { PdfDocument, SignatureFieldData } from '../types';

type PdfPageProps = Readonly<{
  pdfDocument: PdfDocument;
  pageNumber: number;
  scale: number;
  fields: SignatureFieldData[];
  renderField: (field: SignatureFieldData) => React.ReactNode;
  onContainerReady?: (pageNumber: number, element: HTMLDivElement | null) => void;
}>;

export const PdfPage = ({
  pdfDocument,
  pageNumber,
  scale,
  fields,
  renderField,
  onContainerReady,
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
        <div className="absolute inset-0">
          {fields.map((field) => (
            <div key={field.id}>{renderField(field)}</div>
          ))}
        </div>
      </div>
    </div>
  );
};

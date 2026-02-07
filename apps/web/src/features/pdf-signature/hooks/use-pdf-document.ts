import { useEffect, useState } from 'react';

import { PdfDocument, PdfDocumentLoadingTask, PdfjsLib } from '../types';

type UsePdfDocumentState = {
  readonly pdfDocument: PdfDocument | null;
  readonly pageCount: number;
  readonly isLoading: boolean;
  readonly error: string | null;
};

type UsePdfDocumentOptions = Readonly<{
  pdfjsLib: PdfjsLib | null;
  fileUrl: string | null;
}>;

export const usePdfDocument = ({
  pdfjsLib,
  fileUrl,
}: UsePdfDocumentOptions): UsePdfDocumentState => {
  const [pdfDocument, setPdfDocument] = useState<PdfDocument | null>(null);
  const [pageCount, setPageCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!pdfjsLib || !fileUrl) {
      setPdfDocument(null);
      setPageCount(0);
      setIsLoading(false);
      setError(null);
      return;
    }

    let isActive = true;
    let task: PdfDocumentLoadingTask | null = null;

    setIsLoading(true);
    setError(null);

    try {
      task = pdfjsLib.getDocument({ url: fileUrl });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      setError(message);
      setIsLoading(false);
      return;
    }

    task.promise
      .then((document) => {
        if (!isActive) {
          return;
        }
        setPdfDocument(document);
        setPageCount(document.numPages);
        setIsLoading(false);
      })
      .catch((err) => {
        if (!isActive) {
          return;
        }
        const message = err instanceof Error ? err.message : String(err);
        setError(message);
        setIsLoading(false);
      });

    return () => {
      isActive = false;
      if (task) {
        task.destroy();
      }
    };
  }, [fileUrl, pdfjsLib]);

  return {
    pdfDocument,
    pageCount,
    isLoading,
    error,
  };
};

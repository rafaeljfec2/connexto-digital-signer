export type SignatureFieldType = 'signature' | 'name' | 'date' | 'initials' | 'text';

export type SignatureFieldValue = string | null;

export type SignatureFieldData = {
  readonly id: string;
  readonly type: SignatureFieldType;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly signerId: string;
  readonly required: boolean;
  readonly value: SignatureFieldValue;
};

export type FieldPreview = {
  readonly type: SignatureFieldType;
  readonly label: string;
  readonly signerName: string;
  readonly color: string;
  readonly width: number;
  readonly height: number;
};

export type PdfDocumentLoadingTask = {
  readonly promise: Promise<PdfDocument>;
  destroy: () => void;
};

export type PdfjsLib = {
  GlobalWorkerOptions: {
    workerSrc: string;
  };
  getDocument: (src: string | Uint8Array | { url: string }) => PdfDocumentLoadingTask;
};

export type PdfDocument = {
  readonly numPages: number;
  getPage: (pageNumber: number) => Promise<PdfPage>;
};

export type PdfPage = {
  getViewport: (options: { scale: number }) => { width: number; height: number };
  render: (options: {
    canvasContext: CanvasRenderingContext2D;
    viewport: { width: number; height: number };
  }) => { promise: Promise<void> };
};

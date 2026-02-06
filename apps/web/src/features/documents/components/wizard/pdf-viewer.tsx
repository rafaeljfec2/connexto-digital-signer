"use client";

export type PdfViewerProps = {
  readonly fileUrl: string;
};

export function PdfViewer({ fileUrl }: Readonly<PdfViewerProps>) {
  return (
    <div className="h-[900px] w-full overflow-hidden rounded-lg">
      <iframe
        title="pdf-preview"
        src={fileUrl}
        className="h-full w-full"
        loading="lazy"
      />
    </div>
  );
}

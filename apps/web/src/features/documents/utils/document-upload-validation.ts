export const DOCUMENT_UPLOAD_ACCEPT = 'application/pdf,.pdf';

export const PDF_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export const PDF_MAGIC = [0x25, 0x50, 0x44, 0x46] as const;

export type DocumentUploadValidationError =
  | 'unsupportedExtension'
  | 'unsupportedType'
  | 'invalidContent'
  | 'tooLarge';

export function hasPdfExtension(fileName: string): boolean {
  return fileName.toLowerCase().endsWith('.pdf');
}

export function bufferLooksLikePdf(bytes: Uint8Array): boolean {
  if (bytes.length < PDF_MAGIC.length) {
    return false;
  }
  return PDF_MAGIC.every((byte, index) => bytes[index] === byte);
}

export function validateDocumentUploadSync(
  file: File,
): DocumentUploadValidationError | null {
  if (!hasPdfExtension(file.name)) {
    return 'unsupportedExtension';
  }
  if (file.type !== '' && file.type !== 'application/pdf') {
    return 'unsupportedType';
  }
  if (file.size > PDF_MAX_SIZE_BYTES) {
    return 'tooLarge';
  }
  return null;
}

export async function validateDocumentUploadContent(
  file: File,
): Promise<DocumentUploadValidationError | null> {
  const syncError = validateDocumentUploadSync(file);
  if (syncError !== null) {
    return syncError;
  }

  const header = new Uint8Array(await file.slice(0, PDF_MAGIC.length).arrayBuffer());
  if (!bufferLooksLikePdf(header)) {
    return 'invalidContent';
  }
  return null;
}

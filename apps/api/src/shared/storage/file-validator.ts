import { BadRequestException } from '@nestjs/common';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);

export const ALLOWED_MIME_TYPES = new Set(['application/pdf']);

export const MAX_SIZE_BYTES: Readonly<Record<string, number>> = {
  'application/pdf': 5 * 1024 * 1024,
};

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
};

export const PDF_ONLY_ERROR_MESSAGE =
  'Unsupported file type. Only PDF documents are accepted.';

export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return 'application/pdf';
  }

  return null;
}

export function getExtensionFromMime(mime: string): string {
  const ext = MIME_TO_EXTENSION[mime];
  if (!ext) {
    throw new BadRequestException(`Unsupported MIME type: ${mime}`);
  }
  return ext;
}

export interface FileValidationResult {
  readonly mimeType: string;
  readonly extension: string;
}

export function validateFile(buffer: Buffer): FileValidationResult {
  if (!buffer || buffer.length === 0) {
    throw new BadRequestException('File is empty');
  }

  const mimeType = detectMimeType(buffer);

  if (!mimeType || !ALLOWED_MIME_TYPES.has(mimeType)) {
    throw new BadRequestException(PDF_ONLY_ERROR_MESSAGE);
  }

  const maxSize = MAX_SIZE_BYTES[mimeType];
  if (maxSize && buffer.length > maxSize) {
    const maxMb = maxSize / (1024 * 1024);
    throw new BadRequestException(
      `File size exceeds ${maxMb}MB limit for ${mimeType}`,
    );
  }

  return { mimeType, extension: getExtensionFromMime(mimeType) };
}

import { BadRequestException } from '@nestjs/common';

const PDF_MAGIC = Buffer.from([0x25, 0x50, 0x44, 0x46]);
const PNG_MAGIC = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const JPEG_MAGIC = Buffer.from([0xff, 0xd8, 0xff]);
const WEBP_RIFF = Buffer.from([0x52, 0x49, 0x46, 0x46]);
const WEBP_TAG = Buffer.from([0x57, 0x45, 0x42, 0x50]);

export const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'image/png',
  'image/jpeg',
  'image/webp',
]);

export const MAX_SIZE_BYTES: Readonly<Record<string, number>> = {
  'application/pdf': 5 * 1024 * 1024,
  'image/png': 3 * 1024 * 1024,
  'image/jpeg': 3 * 1024 * 1024,
  'image/webp': 3 * 1024 * 1024,
};

const MIME_TO_EXTENSION: Readonly<Record<string, string>> = {
  'application/pdf': 'pdf',
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/webp': 'webp',
};

export function detectMimeType(buffer: Buffer): string | null {
  if (buffer.length < 4) return null;

  if (buffer.subarray(0, 4).equals(PDF_MAGIC)) {
    return 'application/pdf';
  }

  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(PNG_MAGIC)) {
    return 'image/png';
  }

  if (buffer.length >= 3 && buffer.subarray(0, 3).equals(JPEG_MAGIC)) {
    return 'image/jpeg';
  }

  if (
    buffer.length >= 12 &&
    buffer.subarray(0, 4).equals(WEBP_RIFF) &&
    buffer.subarray(8, 12).equals(WEBP_TAG)
  ) {
    return 'image/webp';
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
    throw new BadRequestException(
      'Unsupported file type. Allowed: PDF, PNG, JPEG, WEBP',
    );
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

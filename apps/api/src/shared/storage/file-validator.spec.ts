import { BadRequestException } from '@nestjs/common';
import {
  detectMimeType,
  getExtensionFromMime,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BYTES,
} from './file-validator';

describe('file-validator', () => {
  describe('detectMimeType', () => {
    it('should detect PDF by magic bytes', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
      expect(detectMimeType(buffer)).toBe('application/pdf');
    });

    it('should detect PNG by magic bytes', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(detectMimeType(buffer)).toBe('image/png');
    });

    it('should detect JPEG by magic bytes', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      expect(detectMimeType(buffer)).toBe('image/jpeg');
    });

    it('should detect WEBP by magic bytes', () => {
      const buffer = Buffer.alloc(16);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WEBP', 8);
      expect(detectMimeType(buffer)).toBe('image/webp');
    });

    it('should return null for unknown file types', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05]);
      expect(detectMimeType(buffer)).toBeNull();
    });

    it('should return null for buffer shorter than 4 bytes', () => {
      const buffer = Buffer.from([0x25, 0x50]);
      expect(detectMimeType(buffer)).toBeNull();
    });

    it('should return null for empty buffer', () => {
      expect(detectMimeType(Buffer.alloc(0))).toBeNull();
    });
  });

  describe('getExtensionFromMime', () => {
    it('should return pdf for application/pdf', () => {
      expect(getExtensionFromMime('application/pdf')).toBe('pdf');
    });

    it('should return png for image/png', () => {
      expect(getExtensionFromMime('image/png')).toBe('png');
    });

    it('should return jpg for image/jpeg', () => {
      expect(getExtensionFromMime('image/jpeg')).toBe('jpg');
    });

    it('should return webp for image/webp', () => {
      expect(getExtensionFromMime('image/webp')).toBe('webp');
    });

    it('should throw BadRequestException for unsupported MIME', () => {
      expect(() => getExtensionFromMime('text/plain')).toThrow(BadRequestException);
    });
  });

  describe('validateFile', () => {
    it('should validate a valid PDF buffer', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0x25;
      buffer[1] = 0x50;
      buffer[2] = 0x44;
      buffer[3] = 0x46;

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('application/pdf');
      expect(result.extension).toBe('pdf');
    });

    it('should validate a valid PNG buffer', () => {
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const body = Buffer.alloc(100);
      const buffer = Buffer.concat([header, body]);

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('image/png');
      expect(result.extension).toBe('png');
    });

    it('should validate a valid JPEG buffer', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xd8;
      buffer[2] = 0xff;

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('image/jpeg');
      expect(result.extension).toBe('jpg');
    });

    it('should validate a valid WEBP buffer', () => {
      const buffer = Buffer.alloc(16);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WEBP', 8);

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('image/webp');
      expect(result.extension).toBe('webp');
    });

    it('should reject empty buffer', () => {
      expect(() => validateFile(Buffer.alloc(0))).toThrow(BadRequestException);
      expect(() => validateFile(Buffer.alloc(0))).toThrow('File is empty');
    });

    it('should reject unsupported file type', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);
      expect(() => validateFile(buffer)).toThrow(BadRequestException);
      expect(() => validateFile(buffer)).toThrow('Unsupported file type');
    });

    it('should reject PDF exceeding 5MB', () => {
      const size = 5 * 1024 * 1024 + 1;
      const buffer = Buffer.alloc(size);
      buffer[0] = 0x25;
      buffer[1] = 0x50;
      buffer[2] = 0x44;
      buffer[3] = 0x46;

      expect(() => validateFile(buffer)).toThrow(BadRequestException);
      expect(() => validateFile(buffer)).toThrow('5MB');
    });

    it('should reject image exceeding 3MB', () => {
      const size = 3 * 1024 * 1024 + 1;
      const buffer = Buffer.alloc(size);
      buffer[0] = 0xff;
      buffer[1] = 0xd8;
      buffer[2] = 0xff;

      expect(() => validateFile(buffer)).toThrow(BadRequestException);
      expect(() => validateFile(buffer)).toThrow('3MB');
    });

    it('should accept PDF at exactly 5MB', () => {
      const size = 5 * 1024 * 1024;
      const buffer = Buffer.alloc(size);
      buffer[0] = 0x25;
      buffer[1] = 0x50;
      buffer[2] = 0x44;
      buffer[3] = 0x46;

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('application/pdf');
    });

    it('should accept image at exactly 3MB', () => {
      const size = 3 * 1024 * 1024;
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const body = Buffer.alloc(size - header.length);
      const buffer = Buffer.concat([header, body]);

      const result = validateFile(buffer);
      expect(result.mimeType).toBe('image/png');
    });
  });

  describe('constants', () => {
    it('should have exactly 4 allowed MIME types', () => {
      expect(ALLOWED_MIME_TYPES.size).toBe(4);
      expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/png')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/jpeg')).toBe(true);
      expect(ALLOWED_MIME_TYPES.has('image/webp')).toBe(true);
    });

    it('should have correct size limits', () => {
      expect(MAX_SIZE_BYTES['application/pdf']).toBe(5 * 1024 * 1024);
      expect(MAX_SIZE_BYTES['image/png']).toBe(3 * 1024 * 1024);
      expect(MAX_SIZE_BYTES['image/jpeg']).toBe(3 * 1024 * 1024);
      expect(MAX_SIZE_BYTES['image/webp']).toBe(3 * 1024 * 1024);
    });
  });
});

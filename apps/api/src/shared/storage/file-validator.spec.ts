import { BadRequestException } from '@nestjs/common';
import {
  detectMimeType,
  getExtensionFromMime,
  validateFile,
  ALLOWED_MIME_TYPES,
  MAX_SIZE_BYTES,
  PDF_ONLY_ERROR_MESSAGE,
} from './file-validator';

describe('file-validator', () => {
  describe('detectMimeType', () => {
    it('should detect PDF by magic bytes', () => {
      const buffer = Buffer.from([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e]);
      expect(detectMimeType(buffer)).toBe('application/pdf');
    });

    it('should return null for PNG magic bytes', () => {
      const buffer = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00]);
      expect(detectMimeType(buffer)).toBeNull();
    });

    it('should return null for JPEG magic bytes', () => {
      const buffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00]);
      expect(detectMimeType(buffer)).toBeNull();
    });

    it('should return null for WEBP magic bytes', () => {
      const buffer = Buffer.alloc(16);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WEBP', 8);
      expect(detectMimeType(buffer)).toBeNull();
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

    it('should reject PNG content even with pdf extension implied', () => {
      const header = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
      const body = Buffer.alloc(100);
      const buffer = Buffer.concat([header, body]);

      expect(() => validateFile(buffer)).toThrow(BadRequestException);
      expect(() => validateFile(buffer)).toThrow(PDF_ONLY_ERROR_MESSAGE);
    });

    it('should reject JPEG content', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0xff;
      buffer[1] = 0xd8;
      buffer[2] = 0xff;

      expect(() => validateFile(buffer)).toThrow(PDF_ONLY_ERROR_MESSAGE);
    });

    it('should reject WEBP content', () => {
      const buffer = Buffer.alloc(16);
      buffer.write('RIFF', 0);
      buffer.writeUInt32LE(100, 4);
      buffer.write('WEBP', 8);

      expect(() => validateFile(buffer)).toThrow(PDF_ONLY_ERROR_MESSAGE);
    });

    it('should reject empty buffer', () => {
      expect(() => validateFile(Buffer.alloc(0))).toThrow(BadRequestException);
      expect(() => validateFile(Buffer.alloc(0))).toThrow('File is empty');
    });

    it('should reject unsupported file type', () => {
      const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06, 0x07, 0x08, 0x09]);
      expect(() => validateFile(buffer)).toThrow(PDF_ONLY_ERROR_MESSAGE);
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

    it('should reject fake PDF with wrong magic bytes', () => {
      const buffer = Buffer.alloc(100);
      buffer[0] = 0x00;
      buffer[1] = 0x01;
      buffer[2] = 0x02;
      buffer[3] = 0x03;

      expect(() => validateFile(buffer)).toThrow(PDF_ONLY_ERROR_MESSAGE);
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
  });

  describe('constants', () => {
    it('should allow PDF only', () => {
      expect(ALLOWED_MIME_TYPES.size).toBe(1);
      expect(ALLOWED_MIME_TYPES.has('application/pdf')).toBe(true);
    });

    it('should have correct size limits', () => {
      expect(MAX_SIZE_BYTES['application/pdf']).toBe(5 * 1024 * 1024);
    });
  });
});

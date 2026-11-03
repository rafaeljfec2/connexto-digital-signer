import {
  bufferLooksLikePdf,
  hasPdfExtension,
  validateDocumentUploadSync,
} from './document-upload-validation';

describe('document-upload-validation', () => {
  it('should accept pdf extension and size within limit', () => {
    const file = new File([new Uint8Array(10)], 'contract.pdf', {
      type: 'application/pdf',
    });
    expect(validateDocumentUploadSync(file)).toBeNull();
  });

  it('should reject non-pdf extension', () => {
    const file = new File([new Uint8Array(10)], 'photo.png', { type: 'image/png' });
    expect(validateDocumentUploadSync(file)).toBe('unsupportedExtension');
  });

  it('should reject wrong mime when browser sends one', () => {
    const file = new File([new Uint8Array(10)], 'doc.pdf', { type: 'image/png' });
    expect(validateDocumentUploadSync(file)).toBe('unsupportedType');
  });

  it('should detect pdf magic bytes', () => {
    expect(bufferLooksLikePdf(new Uint8Array([0x25, 0x50, 0x44, 0x46]))).toBe(true);
    expect(bufferLooksLikePdf(new Uint8Array([0x89, 0x50, 0x4e, 0x47]))).toBe(false);
  });
});

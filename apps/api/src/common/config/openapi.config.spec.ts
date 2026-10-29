import { isOpenApiEnabled } from './openapi.config';

describe('isOpenApiEnabled', () => {
  it('should enable OpenAPI when API_DOCS_ENABLED is true', () => {
    expect(isOpenApiEnabled({ API_DOCS_ENABLED: 'true' })).toBe(true);
  });

  it('should keep OpenAPI disabled when the flag is absent', () => {
    expect(isOpenApiEnabled({})).toBe(false);
  });

  it('should reject non-canonical values', () => {
    expect(isOpenApiEnabled({ API_DOCS_ENABLED: '1' })).toBe(false);
    expect(isOpenApiEnabled({ API_DOCS_ENABLED: 'TRUE' })).toBe(false);
    expect(isOpenApiEnabled({ API_DOCS_ENABLED: 'false' })).toBe(false);
    expect(isOpenApiEnabled({ API_DOCS_ENABLED: '' })).toBe(false);
  });

  it('should default to process env', () => {
    const original = process.env['API_DOCS_ENABLED'];
    process.env['API_DOCS_ENABLED'] = 'true';
    try {
      expect(isOpenApiEnabled()).toBe(true);
    } finally {
      if (original === undefined) {
        delete process.env['API_DOCS_ENABLED'];
      } else {
        process.env['API_DOCS_ENABLED'] = original;
      }
    }
  });
});

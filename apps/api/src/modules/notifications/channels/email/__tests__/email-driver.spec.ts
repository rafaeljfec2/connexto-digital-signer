import { resolveEmailDriver, createEmailClientFromEnv } from '../email-driver';

describe('resolveEmailDriver', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should honor explicit EMAIL_DRIVER', () => {
    process.env = { ...originalEnv, EMAIL_DRIVER: 'inmemory', NODE_ENV: 'development' };
    expect(resolveEmailDriver()).toBe('inmemory');
  });

  it('should require mailersend in production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      MAILERSEND_API_KEY: 'mlsn.test',
    };
    delete process.env['EMAIL_DRIVER'];
    expect(resolveEmailDriver()).toBe('mailersend');
  });

  it('should fall back to logger when no API key in development', () => {
    process.env = { ...originalEnv, NODE_ENV: 'development' };
    delete process.env['EMAIL_DRIVER'];
    delete process.env['MAILERSEND_API_KEY'];
    expect(resolveEmailDriver()).toBe('logger');
  });

  it('should select mailersend when API key is present outside production', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'development',
      MAILERSEND_API_KEY: 'mlsn.test',
    };
    delete process.env['EMAIL_DRIVER'];
    expect(resolveEmailDriver()).toBe('mailersend');
  });
});

describe('createEmailClientFromEnv', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should throw in production when MAILERSEND_API_KEY is missing', () => {
    process.env = { ...originalEnv, NODE_ENV: 'production' };
    delete process.env['EMAIL_DRIVER'];
    delete process.env['MAILERSEND_API_KEY'];
    expect(() => createEmailClientFromEnv()).toThrow(/MAILERSEND_API_KEY/);
  });

  it('should throw in production when EMAIL_DRIVER is not mailersend', () => {
    process.env = {
      ...originalEnv,
      NODE_ENV: 'production',
      EMAIL_DRIVER: 'logger',
      MAILERSEND_API_KEY: 'mlsn.test',
    };
    expect(() => createEmailClientFromEnv()).toThrow(/mailersend/);
  });
});

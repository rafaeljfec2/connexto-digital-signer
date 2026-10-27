import { isSchedulerEnabled } from './is-scheduler-enabled';

describe('isSchedulerEnabled', () => {
  const originalEnv = process.env;

  afterEach(() => {
    process.env = originalEnv;
  });

  it('should return true when ENABLE_SCHEDULER is unset', () => {
    process.env = { ...originalEnv };
    delete process.env['ENABLE_SCHEDULER'];
    expect(isSchedulerEnabled()).toBe(true);
  });

  it('should return true when ENABLE_SCHEDULER is true', () => {
    process.env = { ...originalEnv, ENABLE_SCHEDULER: 'true' };
    expect(isSchedulerEnabled()).toBe(true);
  });

  it('should return false when ENABLE_SCHEDULER is false', () => {
    process.env = { ...originalEnv, ENABLE_SCHEDULER: 'false' };
    expect(isSchedulerEnabled()).toBe(false);
  });
});

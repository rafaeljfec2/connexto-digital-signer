import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';
import { formatBootError, runBootMigrations } from './run-boot-migrations';

describe('run-boot-migrations', () => {
  const logger = {
    log: jest.fn(),
    error: jest.fn(),
  } as unknown as Logger;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('formatBootError prefers the stack of an Error', () => {
    const error = new Error('boom');
    expect(formatBootError(error)).toContain('boom');
  });

  test('formatBootError stringifies unknown values', () => {
    expect(formatBootError('plain')).toBe('plain');
  });

  test('runBootMigrations logs success when TypeORM finishes', async () => {
    const dataSource = {
      runMigrations: jest.fn().mockResolvedValue([]),
    } as unknown as DataSource;

    await runBootMigrations(dataSource, logger);

    expect(dataSource.runMigrations).toHaveBeenCalledTimes(1);
    expect(logger.log).toHaveBeenCalledWith('Database migrations completed');
    expect(logger.error).not.toHaveBeenCalled();
  });

  test('runBootMigrations stays up and logs when migrations fail', async () => {
    const dataSource = {
      runMigrations: jest.fn().mockRejectedValue(new Error('uuid_generate_v4() does not exist')),
    } as unknown as DataSource;
    const stderr = jest.spyOn(process.stderr, 'write').mockImplementation(() => true);

    await runBootMigrations(dataSource, logger);

    expect(logger.error).toHaveBeenCalledWith(
      expect.stringContaining('uuid_generate_v4() does not exist')
    );
    expect(stderr).toHaveBeenCalledWith(expect.stringContaining('MIGRATION_FAILED'));
    stderr.mockRestore();
  });
});

import { Logger } from 'nestjs-pino';
import { DataSource } from 'typeorm';

export const formatBootError = (error: unknown): string =>
  error instanceof Error ? (error.stack ?? error.message) : String(error);

export const runBootMigrations = async (
  dataSource: DataSource,
  logger: Logger
): Promise<void> => {
  try {
    await dataSource.runMigrations();
    logger.log('Database migrations completed');
  } catch (error: unknown) {
    const detail = formatBootError(error);
    logger.error(`Database migrations failed: ${detail}`);
    process.stderr.write(`MIGRATION_FAILED ${detail}\n`);
  }
};

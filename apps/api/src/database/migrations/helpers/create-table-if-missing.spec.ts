import type { QueryRunner } from 'typeorm';
import { createTableIfMissing } from './create-table-if-missing';
import { ensureBaselineSchema } from './ensure-baseline-schema';

const createQueryRunner = (existingTables: readonly string[]): QueryRunner =>
  ({
    hasTable: jest.fn(async (table: string) => existingTables.includes(table)),
    query: jest.fn().mockResolvedValue([]),
  }) as unknown as QueryRunner;

describe('createTableIfMissing', () => {
  test('skips SQL when the table already exists', async () => {
    const queryRunner = createQueryRunner(['documents']);

    await createTableIfMissing(queryRunner, 'documents', ['CREATE TABLE documents']);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });

  test('runs each statement when the table is missing', async () => {
    const queryRunner = createQueryRunner([]);

    await createTableIfMissing(queryRunner, 'documents', ['CREATE TYPE t', 'CREATE TABLE documents']);

    expect(queryRunner.query).toHaveBeenCalledTimes(2);
    expect(queryRunner.query).toHaveBeenNthCalledWith(1, 'CREATE TYPE t');
  });
});

describe('ensureBaselineSchema', () => {
  test('creates every missing core table on a fresh database', async () => {
    const queryRunner = createQueryRunner([]);

    await ensureBaselineSchema(queryRunner);

    expect(queryRunner.hasTable).toHaveBeenCalledWith('tenants');
    expect(queryRunner.hasTable).toHaveBeenCalledWith('documents');
    expect(queryRunner.hasTable).toHaveBeenCalledWith('signers');
    expect(queryRunner.query).toHaveBeenCalled();
  });

  test('does not recreate tables that already exist', async () => {
    const queryRunner = createQueryRunner([
      'tenants',
      'documents',
      'signers',
      'webhook_configs',
      'audit_logs',
      'billing_usage',
    ]);

    await ensureBaselineSchema(queryRunner);

    expect(queryRunner.query).not.toHaveBeenCalled();
  });
});

import type { QueryRunner } from 'typeorm';

export const createTableIfMissing = async (
  queryRunner: QueryRunner,
  table: string,
  statements: readonly string[]
): Promise<void> => {
  if (await queryRunner.hasTable(table)) return;
  for (const statement of statements) {
    await queryRunner.query(statement);
  }
};

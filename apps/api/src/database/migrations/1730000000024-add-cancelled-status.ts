import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddCancelledStatus1730000000024 implements MigrationInterface {
  name = 'AddCancelledStatus1730000000024';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TYPE "envelope_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
    await queryRunner.query(
      `ALTER TYPE "documents_status_enum" ADD VALUE IF NOT EXISTS 'cancelled'`,
    );
  }

  public async down(_queryRunner: QueryRunner): Promise<void> {
    // PostgreSQL does not support removing enum values safely.
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerRequestEmail1730000000010 implements MigrationInterface {
  name = 'AddSignerRequestEmail1730000000010';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "request_email" boolean NOT NULL DEFAULT false`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" DROP COLUMN "request_email"`,
    );
  }
}

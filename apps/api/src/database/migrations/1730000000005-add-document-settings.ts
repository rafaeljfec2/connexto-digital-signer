import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentSettings1730000000005 implements MigrationInterface {
  name = 'AddDocumentSettings1730000000005';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "reminder_interval" character varying(20) NOT NULL DEFAULT 'none'`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "signing_language" character varying(10) NOT NULL DEFAULT 'pt-br'`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "closure_mode" character varying(20) NOT NULL DEFAULT 'automatic'`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "reminder_count" integer NOT NULL DEFAULT 0`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "reminder_count"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "closure_mode"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "signing_language"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "reminder_interval"`);
  }
}

import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddDocumentMimeAndSize1730000000017 implements MigrationInterface {
  name = 'AddDocumentMimeAndSize1730000000017';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "mime_type" VARCHAR(50)`,
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "size" BIGINT`,
    );
    await queryRunner.query(
      `UPDATE "documents" SET "mime_type" = 'application/pdf' WHERE "original_file_key" IS NOT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "size"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "mime_type"`);
  }
}

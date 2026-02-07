import { MigrationInterface, QueryRunner } from 'typeorm';

export class MakeFileColumnsNullable1730000000003 implements MigrationInterface {
  name = 'MakeFileColumnsNullable1730000000003';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "original_file_key" DROP NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "original_hash" DROP NOT NULL`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "original_hash" SET NOT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ALTER COLUMN "original_file_key" SET NOT NULL`
    );
  }
}

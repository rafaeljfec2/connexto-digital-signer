import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerViewedAt1730000000015 implements MigrationInterface {
  name = 'AddSignerViewedAt1730000000015';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "viewed_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" DROP COLUMN "viewed_at"`
    );
  }
}

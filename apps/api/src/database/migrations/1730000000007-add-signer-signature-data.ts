import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerSignatureData1730000000007 implements MigrationInterface {
  name = 'AddSignerSignatureData1730000000007';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "signature_data" text DEFAULT NULL`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" DROP COLUMN "signature_data"`
    );
  }
}

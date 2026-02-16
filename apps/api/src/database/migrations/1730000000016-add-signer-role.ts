import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerRole1730000000016 implements MigrationInterface {
  name = 'AddSignerRole1730000000016';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "role" VARCHAR(30) NOT NULL DEFAULT 'signer'`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "role"`);
  }
}

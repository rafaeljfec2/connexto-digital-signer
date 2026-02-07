import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerVerification1730000000006 implements MigrationInterface {
  name = 'AddSignerVerification1730000000006';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "verification_code" character varying(128) DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "verification_expires_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "verification_attempts" integer NOT NULL DEFAULT 0`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "verified_at" TIMESTAMP WITH TIME ZONE DEFAULT NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "verified_at"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "verification_attempts"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "verification_expires_at"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "verification_code"`);
  }
}

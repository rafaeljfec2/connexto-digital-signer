import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerCpfBirthAuth1730000000004 implements MigrationInterface {
  name = 'AddSignerCpfBirthAuth1730000000004';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "cpf" character varying(14)`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "birth_date" date`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "request_cpf" boolean NOT NULL DEFAULT false`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "auth_method" character varying(50) NOT NULL DEFAULT 'email'`,
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "auth_method"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "request_cpf"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "birth_date"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "cpf"`);
  }
}

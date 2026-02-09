import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerPhoneFields1730000000009 implements MigrationInterface {
  name = 'AddSignerPhoneFields1730000000009';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "phone" varchar(20) DEFAULT NULL`
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "request_phone" boolean NOT NULL DEFAULT false`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" DROP COLUMN "request_phone"`
    );
    await queryRunner.query(
      `ALTER TABLE "signers" DROP COLUMN "phone"`
    );
  }
}

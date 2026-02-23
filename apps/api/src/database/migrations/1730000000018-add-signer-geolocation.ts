import type { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSignerGeolocation1730000000018 implements MigrationInterface {
  name = 'AddSignerGeolocation1730000000018';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "latitude" DECIMAL(10,7)`,
    );
    await queryRunner.query(
      `ALTER TABLE "signers" ADD "longitude" DECIMAL(10,7)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "longitude"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "latitude"`);
  }
}

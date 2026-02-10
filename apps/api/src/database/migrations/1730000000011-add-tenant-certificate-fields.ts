import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTenantCertificateFields1730000000011 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('tenants', [
      new TableColumn({
        name: 'certificate_file_key',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
      new TableColumn({
        name: 'certificate_password_enc',
        type: 'text',
        isNullable: true,
      }),
      new TableColumn({
        name: 'certificate_subject',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
      new TableColumn({
        name: 'certificate_issuer',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
      new TableColumn({
        name: 'certificate_expires_at',
        type: 'timestamptz',
        isNullable: true,
      }),
      new TableColumn({
        name: 'certificate_configured_at',
        type: 'timestamptz',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tenants', 'certificate_configured_at');
    await queryRunner.dropColumn('tenants', 'certificate_expires_at');
    await queryRunner.dropColumn('tenants', 'certificate_issuer');
    await queryRunner.dropColumn('tenants', 'certificate_subject');
    await queryRunner.dropColumn('tenants', 'certificate_password_enc');
    await queryRunner.dropColumn('tenants', 'certificate_file_key');
  }
}

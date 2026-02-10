import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddTenantSettingsFields1730000000012 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumns('tenants', [
      new TableColumn({
        name: 'default_signing_language',
        type: 'varchar',
        length: '10',
        default: "'pt-br'",
        isNullable: false,
      }),
      new TableColumn({
        name: 'default_reminder_interval',
        type: 'varchar',
        length: '20',
        default: "'none'",
        isNullable: false,
      }),
      new TableColumn({
        name: 'default_closure_mode',
        type: 'varchar',
        length: '20',
        default: "'automatic'",
        isNullable: false,
      }),
      new TableColumn({
        name: 'email_sender_name',
        type: 'varchar',
        length: '255',
        isNullable: true,
      }),
      new TableColumn({
        name: 'api_key_last_four',
        type: 'varchar',
        length: '4',
        isNullable: true,
      }),
    ]);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('tenants', 'api_key_last_four');
    await queryRunner.dropColumn('tenants', 'email_sender_name');
    await queryRunner.dropColumn('tenants', 'default_closure_mode');
    await queryRunner.dropColumn('tenants', 'default_reminder_interval');
    await queryRunner.dropColumn('tenants', 'default_signing_language');
  }
}

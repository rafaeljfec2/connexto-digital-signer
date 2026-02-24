import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateWebhookDeliveryLogs1730000000021 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'webhook_delivery_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'webhook_config_id', type: 'uuid', isNullable: false },
          { name: 'event', type: 'varchar', length: '100', isNullable: false },
          { name: 'payload', type: 'jsonb', isNullable: false },
          { name: 'status_code', type: 'int', isNullable: true },
          { name: 'response_body', type: 'text', isNullable: true },
          { name: 'duration', type: 'int', isNullable: false },
          { name: 'success', type: 'boolean', isNullable: false },
          { name: 'error', type: 'text', isNullable: true },
          { name: 'attempt_number', type: 'int', default: 1 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['webhook_config_id'],
            referencedTableName: 'webhook_configs',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'webhook_delivery_logs',
      new TableIndex({
        columnNames: ['webhook_config_id', 'created_at'],
        name: 'IDX_webhook_delivery_logs_config_date',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('webhook_delivery_logs', 'IDX_webhook_delivery_logs_config_date');
    await queryRunner.dropTable('webhook_delivery_logs');
  }
}

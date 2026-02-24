import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateApiRequestLogs1730000000022 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_request_logs',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'api_key_id', type: 'uuid', isNullable: true },
          { name: 'method', type: 'varchar', length: '10', isNullable: false },
          { name: 'path', type: 'varchar', length: '2048', isNullable: false },
          { name: 'status_code', type: 'int', isNullable: false },
          { name: 'duration', type: 'int', isNullable: false },
          { name: 'ip', type: 'varchar', length: '45', isNullable: true },
          { name: 'user_agent', type: 'varchar', length: '512', isNullable: true },
          { name: 'response_size', type: 'int', default: 0 },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'api_request_logs',
      new TableIndex({
        columnNames: ['tenant_id', 'created_at'],
        name: 'IDX_api_request_logs_tenant_date',
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('api_request_logs', 'IDX_api_request_logs_tenant_date');
    await queryRunner.dropTable('api_request_logs');
  }
}

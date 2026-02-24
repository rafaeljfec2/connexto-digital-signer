import { MigrationInterface, QueryRunner, Table, TableIndex } from 'typeorm';

export class CreateApiKeys1730000000020 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'api_keys',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          { name: 'tenant_id', type: 'uuid', isNullable: false },
          { name: 'name', type: 'varchar', length: '255', isNullable: false },
          { name: 'key_hash', type: 'varchar', length: '255', isNullable: false },
          { name: 'key_prefix', type: 'varchar', length: '20', default: "'sk_live_'" },
          { name: 'key_last_four', type: 'varchar', length: '4', isNullable: false },
          { name: 'scopes', type: 'text', isNullable: false },
          { name: 'expires_at', type: 'timestamptz', isNullable: true },
          { name: 'last_used_at', type: 'timestamptz', isNullable: true },
          { name: 'total_requests', type: 'int', default: 0 },
          { name: 'is_active', type: 'boolean', default: true },
          { name: 'revoked_at', type: 'timestamptz', isNullable: true },
          { name: 'created_at', type: 'timestamptz', default: 'now()' },
        ],
        foreignKeys: [
          {
            columnNames: ['tenant_id'],
            referencedTableName: 'tenants',
            referencedColumnNames: ['id'],
            onDelete: 'CASCADE',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({ columnNames: ['key_hash', 'is_active'], name: 'IDX_api_keys_hash_active' }),
    );

    await queryRunner.createIndex(
      'api_keys',
      new TableIndex({ columnNames: ['tenant_id', 'is_active'], name: 'IDX_api_keys_tenant_active' }),
    );

    await queryRunner.query(`
      INSERT INTO api_keys (tenant_id, name, key_hash, key_prefix, key_last_four, scopes, is_active, created_at)
      SELECT
        id,
        'Legacy API Key',
        api_key_hash,
        'sk_',
        COALESCE(api_key_last_four, '****'),
        'documents:read,documents:write,webhooks:manage,templates:read,templates:write,signers:manage,envelopes:read,envelopes:write',
        true,
        now()
      FROM tenants
      WHERE api_key_hash IS NOT NULL
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_tenant_active');
    await queryRunner.dropIndex('api_keys', 'IDX_api_keys_hash_active');
    await queryRunner.dropTable('api_keys');
  }
}

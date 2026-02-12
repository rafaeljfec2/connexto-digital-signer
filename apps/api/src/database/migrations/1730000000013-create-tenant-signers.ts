import { MigrationInterface, QueryRunner, Table, TableIndex, TableColumn, TableForeignKey } from 'typeorm';

export class CreateTenantSigners1730000000013 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.createTable(
      new Table({
        name: 'tenant_signers',
        columns: [
          {
            name: 'id',
            type: 'uuid',
            isPrimary: true,
            generationStrategy: 'uuid',
            default: 'uuid_generate_v4()',
          },
          {
            name: 'tenant_id',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'name',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'email',
            type: 'varchar',
            length: '255',
            isNullable: false,
          },
          {
            name: 'cpf',
            type: 'varchar',
            length: '14',
            isNullable: true,
          },
          {
            name: 'phone',
            type: 'varchar',
            length: '20',
            isNullable: true,
          },
          {
            name: 'birth_date',
            type: 'date',
            isNullable: true,
          },
          {
            name: 'created_at',
            type: 'timestamptz',
            default: 'now()',
          },
          {
            name: 'updated_at',
            type: 'timestamptz',
            default: 'now()',
          },
        ],
      }),
      true,
    );

    await queryRunner.createIndex(
      'tenant_signers',
      new TableIndex({
        name: 'IDX_tenant_signer_tenant',
        columnNames: ['tenant_id'],
      }),
    );

    await queryRunner.createIndex(
      'tenant_signers',
      new TableIndex({
        name: 'UQ_tenant_signer_email',
        columnNames: ['tenant_id', 'email'],
        isUnique: true,
      }),
    );

    await queryRunner.query(`
      INSERT INTO "tenant_signers" ("tenant_id", "name", "email", "cpf", "phone", "birth_date")
      SELECT DISTINCT ON (s."tenant_id", LOWER(s."email"))
        s."tenant_id",
        s."name",
        s."email",
        s."cpf",
        s."phone",
        s."birth_date"
      FROM "signers" s
      ORDER BY s."tenant_id", LOWER(s."email"), s."created_at" DESC
    `);

    await queryRunner.query(`
      UPDATE "tenant_signers" ts
      SET "cpf" = NULL
      WHERE ts."cpf" IS NOT NULL
        AND ts."id" != (
          SELECT t2."id"
          FROM "tenant_signers" t2
          WHERE t2."tenant_id" = ts."tenant_id"
            AND t2."cpf" = ts."cpf"
          ORDER BY t2."created_at" ASC
          LIMIT 1
        )
    `);

    await queryRunner.query(
      `CREATE UNIQUE INDEX "UQ_tenant_signer_cpf" ON "tenant_signers" ("tenant_id", "cpf") WHERE "cpf" IS NOT NULL`,
    );

    await queryRunner.addColumn(
      'signers',
      new TableColumn({
        name: 'tenant_signer_id',
        type: 'uuid',
        isNullable: true,
      }),
    );

    await queryRunner.createForeignKey(
      'signers',
      new TableForeignKey({
        name: 'FK_signer_tenant_signer',
        columnNames: ['tenant_signer_id'],
        referencedTableName: 'tenant_signers',
        referencedColumnNames: ['id'],
        onDelete: 'SET NULL',
      }),
    );

    await queryRunner.query(`
      UPDATE "signers" s
      SET "tenant_signer_id" = ts."id"
      FROM "tenant_signers" ts
      WHERE s."tenant_id" = ts."tenant_id"
        AND LOWER(s."email") = LOWER(ts."email")
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropForeignKey('signers', 'FK_signer_tenant_signer');
    await queryRunner.dropColumn('signers', 'tenant_signer_id');
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_tenant_signer_cpf"`);
    await queryRunner.dropTable('tenant_signers');
  }
}

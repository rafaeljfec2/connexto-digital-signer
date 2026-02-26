import { MigrationInterface, QueryRunner, TableColumn } from 'typeorm';

export class AddDocumentP7sFileKey1730000000023 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.addColumn(
      'documents',
      new TableColumn({
        name: 'p7s_file_key',
        type: 'varchar',
        length: '512',
        isNullable: true,
      }),
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.dropColumn('documents', 'p7s_file_key');
  }
}

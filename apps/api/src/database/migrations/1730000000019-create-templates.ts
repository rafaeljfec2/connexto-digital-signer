import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateTemplates1730000000019 implements MigrationInterface {
  name = 'CreateTemplates1730000000019';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "templates" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" varchar(255) NOT NULL,
        "name" varchar(500) NOT NULL,
        "description" text,
        "category" varchar(100),
        "signing_mode" "envelope_signing_mode_enum" NOT NULL DEFAULT 'parallel',
        "signing_language" varchar(10) NOT NULL DEFAULT 'pt-br',
        "reminder_interval" varchar(20) NOT NULL DEFAULT 'none',
        "closure_mode" varchar(20) NOT NULL DEFAULT 'automatic',
        "is_active" boolean NOT NULL DEFAULT true,
        "usage_count" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_templates" PRIMARY KEY ("id")
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_templates_tenant" ON "templates" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_templates_tenant_active" ON "templates" ("tenant_id", "is_active")`);

    await queryRunner.query(`
      CREATE TABLE "template_documents" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "file_key" varchar(512) NOT NULL,
        "mime_type" varchar(50) NOT NULL,
        "size" bigint NOT NULL,
        "position" int NOT NULL DEFAULT 0,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_documents" PRIMARY KEY ("id"),
        CONSTRAINT "FK_template_documents_template" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_template_documents_template" ON "template_documents" ("template_id")`);

    await queryRunner.query(`
      CREATE TABLE "template_signers" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "label" varchar(255) NOT NULL,
        "role" varchar(30) NOT NULL DEFAULT 'signer',
        "order" int,
        "auth_method" varchar(50) NOT NULL DEFAULT 'email',
        "request_email" boolean NOT NULL DEFAULT false,
        "request_cpf" boolean NOT NULL DEFAULT false,
        "request_phone" boolean NOT NULL DEFAULT false,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_signers" PRIMARY KEY ("id"),
        CONSTRAINT "FK_template_signers_template" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_template_signers_template" ON "template_signers" ("template_id")`);

    await queryRunner.query(`
      CREATE TYPE "template_field_type_enum" AS ENUM ('signature', 'name', 'date', 'initials', 'text')
    `);

    await queryRunner.query(`
      CREATE TABLE "template_fields" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_document_id" uuid NOT NULL,
        "template_signer_id" uuid NOT NULL,
        "type" "template_field_type_enum" NOT NULL,
        "page" int NOT NULL,
        "x" double precision NOT NULL,
        "y" double precision NOT NULL,
        "width" double precision NOT NULL,
        "height" double precision NOT NULL,
        "required" boolean NOT NULL DEFAULT true,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_fields" PRIMARY KEY ("id"),
        CONSTRAINT "FK_template_fields_document" FOREIGN KEY ("template_document_id") REFERENCES "template_documents"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_template_fields_signer" FOREIGN KEY ("template_signer_id") REFERENCES "template_signers"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_template_fields_document" ON "template_fields" ("template_document_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_template_fields_signer" ON "template_fields" ("template_signer_id")`);

    await queryRunner.query(`
      CREATE TYPE "template_variable_type_enum" AS ENUM ('text', 'date', 'number')
    `);

    await queryRunner.query(`
      CREATE TABLE "template_variables" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "template_id" uuid NOT NULL,
        "key" varchar(100) NOT NULL,
        "label" varchar(255) NOT NULL,
        "type" "template_variable_type_enum" NOT NULL DEFAULT 'text',
        "required" boolean NOT NULL DEFAULT true,
        "default_value" varchar(500),
        "created_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_template_variables" PRIMARY KEY ("id"),
        CONSTRAINT "FK_template_variables_template" FOREIGN KEY ("template_id") REFERENCES "templates"("id") ON DELETE CASCADE
      )
    `);
    await queryRunner.query(`CREATE INDEX "IDX_template_variables_template" ON "template_variables" ("template_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_template_variables_template_key" ON "template_variables" ("template_id", "key")`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE IF EXISTS "template_variables"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "template_variable_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_fields"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "template_field_type_enum"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_signers"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "template_documents"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "templates"`);
  }
}

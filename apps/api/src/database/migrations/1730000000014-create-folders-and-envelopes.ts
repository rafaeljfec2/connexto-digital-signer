import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateFoldersAndEnvelopes1730000000014 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "folders" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" varchar(255) NOT NULL,
        "parent_id" uuid,
        "name" varchar(255) NOT NULL,
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_folders" PRIMARY KEY ("id"),
        CONSTRAINT "FK_folders_parent" FOREIGN KEY ("parent_id") REFERENCES "folders"("id") ON DELETE CASCADE
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_folders_tenant" ON "folders" ("tenant_id")`);
    await queryRunner.query(`CREATE UNIQUE INDEX "UQ_folders_tenant_parent_name" ON "folders" ("tenant_id", COALESCE("parent_id", '00000000-0000-0000-0000-000000000000'), "name")`);

    await queryRunner.query(`
      CREATE TYPE "envelope_status_enum" AS ENUM ('draft', 'pending_signatures', 'completed', 'expired')
    `);

    await queryRunner.query(`
      CREATE TYPE "envelope_signing_mode_enum" AS ENUM ('parallel', 'sequential')
    `);

    await queryRunner.query(`
      CREATE TABLE "envelopes" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" varchar(255) NOT NULL,
        "folder_id" uuid NOT NULL,
        "title" varchar(500) NOT NULL,
        "status" "envelope_status_enum" NOT NULL DEFAULT 'draft',
        "signing_mode" "envelope_signing_mode_enum" NOT NULL DEFAULT 'parallel',
        "expires_at" timestamptz,
        "reminder_interval" varchar(20) NOT NULL DEFAULT 'none',
        "signing_language" varchar(10) NOT NULL DEFAULT 'pt-br',
        "closure_mode" varchar(20) NOT NULL DEFAULT 'automatic',
        "created_at" timestamptz NOT NULL DEFAULT now(),
        "updated_at" timestamptz NOT NULL DEFAULT now(),
        CONSTRAINT "PK_envelopes" PRIMARY KEY ("id"),
        CONSTRAINT "FK_envelopes_folder" FOREIGN KEY ("folder_id") REFERENCES "folders"("id") ON DELETE RESTRICT
      )
    `);

    await queryRunner.query(`CREATE INDEX "IDX_envelopes_tenant" ON "envelopes" ("tenant_id")`);
    await queryRunner.query(`CREATE INDEX "IDX_envelopes_tenant_status" ON "envelopes" ("tenant_id", "status")`);
    await queryRunner.query(`CREATE INDEX "IDX_envelopes_folder" ON "envelopes" ("folder_id")`);

    const tenants: Array<{ tenant_id: string }> = await queryRunner.query(
      `SELECT DISTINCT "tenant_id" FROM "documents"`
    );

    for (const { tenant_id } of tenants) {
      const [rootFolder]: Array<{ id: string }> = await queryRunner.query(
        `INSERT INTO "folders" ("tenant_id", "parent_id", "name") VALUES ($1, NULL, 'Documentos') RETURNING "id"`,
        [tenant_id],
      );

      await queryRunner.query(`
        INSERT INTO "envelopes" ("tenant_id", "folder_id", "title", "status", "signing_mode", "expires_at", "reminder_interval", "signing_language", "closure_mode", "created_at", "updated_at")
        SELECT
          d."tenant_id",
          $1,
          d."title",
          d."status"::text::"envelope_status_enum",
          d."signing_mode"::text::"envelope_signing_mode_enum",
          d."expires_at",
          d."reminder_interval",
          d."signing_language",
          d."closure_mode",
          d."created_at",
          d."updated_at"
        FROM "documents" d
        WHERE d."tenant_id" = $2
      `, [rootFolder.id, tenant_id]);
    }

    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "envelope_id" uuid`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "position" int NOT NULL DEFAULT 0`);

    await queryRunner.query(`
      UPDATE "documents" d
      SET "envelope_id" = e."id"
      FROM "envelopes" e
      WHERE e."tenant_id" = d."tenant_id"
        AND e."title" = d."title"
        AND e."created_at" = d."created_at"
    `);

    await queryRunner.query(`ALTER TABLE "documents" ALTER COLUMN "envelope_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "documents" ADD CONSTRAINT "FK_documents_envelope" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE
    `);
    await queryRunner.query(`CREATE INDEX "IDX_documents_envelope" ON "documents" ("envelope_id")`);

    await queryRunner.query(`ALTER TABLE "signers" ADD COLUMN "envelope_id" uuid`);

    await queryRunner.query(`
      UPDATE "signers" s
      SET "envelope_id" = d."envelope_id"
      FROM "documents" d
      WHERE d."id" = s."document_id"::uuid
    `);

    await queryRunner.query(`ALTER TABLE "signers" ALTER COLUMN "envelope_id" SET NOT NULL`);
    await queryRunner.query(`
      ALTER TABLE "signers" ADD CONSTRAINT "FK_signers_envelope" FOREIGN KEY ("envelope_id") REFERENCES "envelopes"("id") ON DELETE CASCADE
    `);

    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signers_tenant_document"`);
    await queryRunner.query(`CREATE INDEX "IDX_signers_tenant_envelope" ON "signers" ("tenant_id", "envelope_id")`);

    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "signing_mode"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "expires_at"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "reminder_interval"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "signing_language"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN IF EXISTS "closure_mode"`);

    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN IF EXISTS "document_id"`);

    await queryRunner.query(`DROP TYPE IF EXISTS "documents_signing_mode_enum"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_documents_tenant_expires"`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE "signers" ADD COLUMN "document_id" varchar(255)`);

    await queryRunner.query(`
      UPDATE "signers" s
      SET "document_id" = (
        SELECT d."id" FROM "documents" d WHERE d."envelope_id" = s."envelope_id" LIMIT 1
      )
    `);

    await queryRunner.query(`ALTER TABLE "signers" DROP CONSTRAINT IF EXISTS "FK_signers_envelope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signers_tenant_envelope"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "envelope_id"`);
    await queryRunner.query(`CREATE INDEX "IDX_signers_tenant_document" ON "signers" ("tenant_id", "document_id")`);

    await queryRunner.query(`CREATE TYPE "documents_signing_mode_enum" AS ENUM ('parallel', 'sequential')`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "signing_mode" "documents_signing_mode_enum" NOT NULL DEFAULT 'parallel'`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "expires_at" timestamptz`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "reminder_interval" varchar(20) NOT NULL DEFAULT 'none'`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "signing_language" varchar(10) NOT NULL DEFAULT 'pt-br'`);
    await queryRunner.query(`ALTER TABLE "documents" ADD COLUMN "closure_mode" varchar(20) NOT NULL DEFAULT 'automatic'`);

    await queryRunner.query(`
      UPDATE "documents" d
      SET
        "signing_mode" = e."signing_mode"::text::"documents_signing_mode_enum",
        "expires_at" = e."expires_at",
        "reminder_interval" = e."reminder_interval",
        "signing_language" = e."signing_language",
        "closure_mode" = e."closure_mode"
      FROM "envelopes" e
      WHERE e."id" = d."envelope_id"
    `);

    await queryRunner.query(`ALTER TABLE "documents" DROP CONSTRAINT IF EXISTS "FK_documents_envelope"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_documents_envelope"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "envelope_id"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "position"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "envelopes"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "envelope_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "envelope_signing_mode_enum"`);

    await queryRunner.query(`DROP TABLE IF EXISTS "folders"`);
  }
}

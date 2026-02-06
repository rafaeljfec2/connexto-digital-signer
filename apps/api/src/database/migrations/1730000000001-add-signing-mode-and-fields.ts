import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddSigningModeAndFields1730000000001 implements MigrationInterface {
  name = 'AddSigningModeAndFields1730000000001';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."documents_signing_mode_enum" AS ENUM('parallel', 'sequential')`
    );
    await queryRunner.query(
      `ALTER TABLE "documents" ADD "signing_mode" "public"."documents_signing_mode_enum" NOT NULL DEFAULT 'parallel'`
    );
    await queryRunner.query(`ALTER TABLE "signers" ADD "order" integer`);
    await queryRunner.query(`ALTER TABLE "signers" ADD "notified_at" TIMESTAMP WITH TIME ZONE`);
    await queryRunner.query(
      `CREATE TYPE "public"."signature_fields_type_enum" AS ENUM('signature', 'name', 'date', 'initials', 'text')`
    );
    await queryRunner.query(
      `CREATE TABLE "signature_fields" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying(255) NOT NULL, "document_id" uuid NOT NULL, "signer_id" uuid NOT NULL, "type" "public"."signature_fields_type_enum" NOT NULL, "page" integer NOT NULL, "x" double precision NOT NULL, "y" double precision NOT NULL, "width" double precision NOT NULL, "height" double precision NOT NULL, "required" boolean NOT NULL DEFAULT true, "value" text, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_signature_fields_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signature_fields_tenant_id" ON "signature_fields" ("tenant_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signature_fields_document_id" ON "signature_fields" ("document_id")`
    );
    await queryRunner.query(
      `CREATE INDEX "IDX_signature_fields_signer_id" ON "signature_fields" ("signer_id")`
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_signature_fields_signer_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signature_fields_document_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_signature_fields_tenant_id"`);
    await queryRunner.query(`DROP TABLE "signature_fields"`);
    await queryRunner.query(`DROP TYPE "public"."signature_fields_type_enum"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "notified_at"`);
    await queryRunner.query(`ALTER TABLE "signers" DROP COLUMN "order"`);
    await queryRunner.query(`ALTER TABLE "documents" DROP COLUMN "signing_mode"`);
    await queryRunner.query(`DROP TYPE "public"."documents_signing_mode_enum"`);
  }
}

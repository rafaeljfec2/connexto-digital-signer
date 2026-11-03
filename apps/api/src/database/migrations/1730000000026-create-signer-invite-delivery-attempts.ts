import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateSignerInviteDeliveryAttempts1730000000026 implements MigrationInterface {
  name = 'CreateSignerInviteDeliveryAttempts1730000000026';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TYPE "signer_invite_delivery_trigger_enum" AS ENUM (
        'initial_send',
        'sequential_next',
        'manual_resend',
        'legacy_backfill'
      )
    `);

    await queryRunner.query(`
      CREATE TYPE "signer_invite_delivery_status_enum" AS ENUM (
        'queued',
        'sent',
        'failed'
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "signer_invite_delivery_attempts" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" varchar(255) NOT NULL,
        "envelope_id" uuid NOT NULL,
        "signer_id" uuid NOT NULL,
        "attempt_number" int NOT NULL,
        "trigger" "signer_invite_delivery_trigger_enum" NOT NULL,
        "status" "signer_invite_delivery_status_enum" NOT NULL,
        "started_at" TIMESTAMPTZ NOT NULL,
        "finished_at" TIMESTAMPTZ,
        "error_message" text,
        "provider_message_id" varchar(255),
        "created_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
        CONSTRAINT "PK_signer_invite_delivery_attempts" PRIMARY KEY ("id"),
        CONSTRAINT "FK_signer_invite_delivery_signer" FOREIGN KEY ("signer_id")
          REFERENCES "signers"("id") ON DELETE CASCADE,
        CONSTRAINT "FK_signer_invite_delivery_envelope" FOREIGN KEY ("envelope_id")
          REFERENCES "envelopes"("id") ON DELETE CASCADE,
        CONSTRAINT "UQ_signer_invite_delivery_signer_attempt" UNIQUE ("signer_id", "attempt_number")
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_signer_invite_delivery_tenant_envelope"
      ON "signer_invite_delivery_attempts" ("tenant_id", "envelope_id")
    `);

    await queryRunner.query(`
      CREATE UNIQUE INDEX "UQ_signer_invite_delivery_legacy_backfill"
      ON "signer_invite_delivery_attempts" ("signer_id")
      WHERE "trigger" = 'legacy_backfill'
    `);

    await queryRunner.query(`
      INSERT INTO "signer_invite_delivery_attempts" (
        "tenant_id",
        "envelope_id",
        "signer_id",
        "attempt_number",
        "trigger",
        "status",
        "started_at",
        "finished_at"
      )
      SELECT
        s."tenant_id",
        s."envelope_id",
        s."id",
        COALESCE(
          (
            SELECT MAX(a."attempt_number")
            FROM "signer_invite_delivery_attempts" a
            WHERE a."signer_id" = s."id"
          ),
          0
        ) + 1,
        'legacy_backfill',
        'sent',
        s."notified_at",
        s."notified_at"
      FROM "signers" s
      WHERE s."notified_at" IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM "signer_invite_delivery_attempts" a
          WHERE a."signer_id" = s."id"
            AND a."trigger" = 'legacy_backfill'
        )
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX IF EXISTS "UQ_signer_invite_delivery_legacy_backfill"`);
    await queryRunner.query(`DROP INDEX IF EXISTS "IDX_signer_invite_delivery_tenant_envelope"`);
    await queryRunner.query(`DROP TABLE IF EXISTS "signer_invite_delivery_attempts"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "signer_invite_delivery_status_enum"`);
    await queryRunner.query(`DROP TYPE IF EXISTS "signer_invite_delivery_trigger_enum"`);
  }
}

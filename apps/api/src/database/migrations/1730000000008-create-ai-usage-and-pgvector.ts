import type { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAiUsageAndPgvector1730000000008 implements MigrationInterface {
  name = 'CreateAiUsageAndPgvector1730000000008';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE "ai_usage" (
        "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
        "tenant_id" character varying(255) NOT NULL,
        "period_year" int NOT NULL,
        "period_month" int NOT NULL,
        "prompt_tokens" int NOT NULL DEFAULT 0,
        "completion_tokens" int NOT NULL DEFAULT 0,
        "total_tokens" int NOT NULL DEFAULT 0,
        "request_count" int NOT NULL DEFAULT 0,
        "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
        CONSTRAINT "PK_ai_usage_id" PRIMARY KEY ("id")
      )`
    );

    await queryRunner.query(
      `CREATE UNIQUE INDEX "IDX_ai_usage_tenant_period" ON "ai_usage" ("tenant_id", "period_year", "period_month")`
    );

    await queryRunner.query(
      `CREATE INDEX "IDX_ai_usage_tenant_id" ON "ai_usage" ("tenant_id")`
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "IDX_ai_usage_tenant_id"`);
    await queryRunner.query(`DROP INDEX "IDX_ai_usage_tenant_period"`);
    await queryRunner.query(`DROP TABLE "ai_usage"`);
  }
}

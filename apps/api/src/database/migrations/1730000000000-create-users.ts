import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateUsers1730000000000 implements MigrationInterface {
  name = 'CreateUsers1730000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TYPE "public"."users_role_enum" AS ENUM('owner', 'admin', 'member')`
    );
    await queryRunner.query(
      `CREATE TABLE "users" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "tenant_id" character varying(255) NOT NULL, "email" character varying(255) NOT NULL, "password_hash" character varying(255) NOT NULL, "name" character varying(255) NOT NULL, "role" "public"."users_role_enum" NOT NULL DEFAULT 'member', "is_active" boolean NOT NULL DEFAULT true, "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(), CONSTRAINT "PK_users_id" PRIMARY KEY ("id"))`
    );
    await queryRunner.query(`CREATE UNIQUE INDEX "IDX_users_email" ON "users" ("email")`);
    await queryRunner.query(`CREATE INDEX "IDX_users_tenant_id" ON "users" ("tenant_id")`);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP INDEX "public"."IDX_users_tenant_id"`);
    await queryRunner.query(`DROP INDEX "public"."IDX_users_email"`);
    await queryRunner.query(`DROP TABLE "users"`);
    await queryRunner.query(`DROP TYPE "public"."users_role_enum"`);
  }
}

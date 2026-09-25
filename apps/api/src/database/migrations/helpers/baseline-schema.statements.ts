export const DOCUMENTS_BASELINE_SQL = [
  `CREATE TYPE "public"."documents_status_enum" AS ENUM('draft', 'pending_signatures', 'completed', 'expired')`,
  `CREATE TABLE "documents" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" character varying(255) NOT NULL,
    "title" character varying(500) NOT NULL,
    "original_file_key" character varying(512) NOT NULL,
    "final_file_key" character varying(512),
    "original_hash" character varying(64) NOT NULL,
    "final_hash" character varying(64),
    "status" "public"."documents_status_enum" NOT NULL DEFAULT 'draft',
    "version" integer NOT NULL DEFAULT 1,
    "expires_at" TIMESTAMP WITH TIME ZONE,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_documents_id" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX "IDX_documents_tenant_id" ON "documents" ("tenant_id")`,
  `CREATE INDEX "IDX_documents_tenant_status" ON "documents" ("tenant_id", "status")`,
  `CREATE INDEX "IDX_documents_tenant_expires" ON "documents" ("tenant_id", "expires_at")`,
] as const;

export const SIGNERS_BASELINE_SQL = [
  `CREATE TYPE "public"."signers_status_enum" AS ENUM('pending', 'signed')`,
  `CREATE TABLE "signers" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" character varying(255) NOT NULL,
    "document_id" character varying(255) NOT NULL,
    "name" character varying(255) NOT NULL,
    "email" character varying(255) NOT NULL,
    "status" "public"."signers_status_enum" NOT NULL DEFAULT 'pending',
    "access_token" character varying(64) NOT NULL,
    "signed_at" TIMESTAMP WITH TIME ZONE,
    "ip_address" character varying(45),
    "user_agent" text,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_signers_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_signers_access_token" UNIQUE ("access_token")
  )`,
  `CREATE INDEX "IDX_signers_tenant_document" ON "signers" ("tenant_id", "document_id")`,
] as const;

export const TENANTS_BASELINE_SQL = [
  `CREATE TABLE "tenants" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "name" character varying(255) NOT NULL,
    "slug" character varying(100) NOT NULL,
    "branding" jsonb,
    "legalTexts" jsonb,
    "usageLimits" jsonb,
    "api_key_hash" character varying(255),
    "is_active" boolean NOT NULL DEFAULT true,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_tenants_id" PRIMARY KEY ("id"),
    CONSTRAINT "UQ_tenants_slug" UNIQUE ("slug")
  )`,
  `CREATE INDEX "IDX_tenants_api_key_hash_is_active" ON "tenants" ("api_key_hash", "is_active")`,
] as const;

export const WEBHOOK_CONFIGS_BASELINE_SQL = [
  `CREATE TABLE "webhook_configs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" character varying(255) NOT NULL,
    "url" character varying(2048) NOT NULL,
    "secret" character varying(255) NOT NULL,
    "events" text NOT NULL,
    "is_active" boolean NOT NULL DEFAULT true,
    "retry_config" jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_webhook_configs_id" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX "IDX_webhook_configs_tenant_active" ON "webhook_configs" ("tenant_id", "is_active")`,
] as const;

export const AUDIT_LOGS_BASELINE_SQL = [
  `CREATE TABLE "audit_logs" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" character varying(255) NOT NULL,
    "event_type" character varying(100) NOT NULL,
    "entity_type" character varying(100) NOT NULL,
    "entity_id" character varying(255) NOT NULL,
    "actor_id" character varying(255),
    "actor_type" character varying(50),
    "metadata" jsonb,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_audit_logs_id" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX "IDX_audit_logs_tenant_id" ON "audit_logs" ("tenant_id")`,
  `CREATE INDEX "IDX_audit_logs_tenant_entity" ON "audit_logs" ("tenant_id", "entity_type", "entity_id")`,
  `CREATE INDEX "IDX_audit_logs_tenant_created" ON "audit_logs" ("tenant_id", "created_at")`,
] as const;

export const BILLING_USAGE_BASELINE_SQL = [
  `CREATE TABLE "billing_usage" (
    "id" uuid NOT NULL DEFAULT uuid_generate_v4(),
    "tenant_id" character varying(255) NOT NULL,
    "period_year" integer NOT NULL,
    "period_month" integer NOT NULL,
    "documents_count" integer NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    "updated_at" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    CONSTRAINT "PK_billing_usage_id" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX "IDX_billing_usage_tenant_period" ON "billing_usage" ("tenant_id", "period_year", "period_month")`,
] as const;

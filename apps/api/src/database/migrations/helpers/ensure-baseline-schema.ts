import type { QueryRunner } from 'typeorm';
import {
  AUDIT_LOGS_BASELINE_SQL,
  BILLING_USAGE_BASELINE_SQL,
  DOCUMENTS_BASELINE_SQL,
  SIGNERS_BASELINE_SQL,
  TENANTS_BASELINE_SQL,
  WEBHOOK_CONFIGS_BASELINE_SQL,
} from './baseline-schema.statements';
import { createTableIfMissing } from './create-table-if-missing';

export const ensureBaselineSchema = async (queryRunner: QueryRunner): Promise<void> => {
  await createTableIfMissing(queryRunner, 'tenants', TENANTS_BASELINE_SQL);
  await createTableIfMissing(queryRunner, 'documents', DOCUMENTS_BASELINE_SQL);
  await createTableIfMissing(queryRunner, 'signers', SIGNERS_BASELINE_SQL);
  await createTableIfMissing(queryRunner, 'webhook_configs', WEBHOOK_CONFIGS_BASELINE_SQL);
  await createTableIfMissing(queryRunner, 'audit_logs', AUDIT_LOGS_BASELINE_SQL);
  await createTableIfMissing(queryRunner, 'billing_usage', BILLING_USAGE_BASELINE_SQL);
};

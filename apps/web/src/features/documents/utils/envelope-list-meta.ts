import type { EnvelopeStatus } from '../api';

export type EnvelopeListMetaLabels = Readonly<{
  pendingCount: (count: number) => string;
  noPending: string;
  notApplicable: string;
  noDeadline: string;
}>;

export type PendingSignersDisplay =
  | Readonly<{ kind: 'count'; value: string }>
  | Readonly<{ kind: 'none'; value: string }>
  | Readonly<{ kind: 'dash'; value: string }>;

const AWAITING_SIGNATURE_STATUSES = new Set<EnvelopeStatus>([
  'pending_signatures',
  'expired',
]);

export function formatPendingSignersDisplay(
  pendingSignerCount: number,
  status: EnvelopeStatus,
  labels: EnvelopeListMetaLabels,
): PendingSignersDisplay {
  if (pendingSignerCount > 0) {
    return { kind: 'count', value: labels.pendingCount(pendingSignerCount) };
  }
  if (AWAITING_SIGNATURE_STATUSES.has(status)) {
    return { kind: 'none', value: labels.noPending };
  }
  return { kind: 'dash', value: labels.notApplicable };
}

export function formatExpiresAtDisplay(
  expiresAt: string | null,
  formatDate: (value: string) => string,
  noDeadlineLabel: string,
): string {
  if (expiresAt === null) {
    return noDeadlineLabel;
  }
  return formatDate(expiresAt);
}

type DocumentsListTranslator = (
  key: string,
  values?: Record<string, string | number>,
) => string;

export function buildEnvelopeListMetaLabels(
  t: DocumentsListTranslator,
): EnvelopeListMetaLabels {
  return {
    pendingCount: (count) => t('list.pendingCount', { count }),
    noPending: t('list.noPending'),
    notApplicable: t('list.pendingNotApplicable'),
    noDeadline: t('list.noDeadline'),
  };
}

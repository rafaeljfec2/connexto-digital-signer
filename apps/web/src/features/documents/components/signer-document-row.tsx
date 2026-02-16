'use client';

import type { SignerDocumentResult } from '@/features/documents/api';
import { Card } from '@/shared/ui';
import { FileText, ExternalLink } from 'lucide-react';

type SignerDocumentRowProps = Readonly<{
  item: SignerDocumentResult;
  signLabel: string;
  formatDate: (value: string) => string;
  onSign: (accessToken: string) => void;
}>;

export function SignerDocumentRow({
  item,
  signLabel,
  formatDate,
  onSign,
}: SignerDocumentRowProps) {
  return (
    <Card
      variant="glass"
      className="p-4 transition-colors hover:bg-th-hover"
    >
      <div className="flex flex-col gap-3 sm:grid sm:grid-cols-12 sm:items-center sm:gap-4">
        <div className="flex items-center gap-3 sm:col-span-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <span className="truncate text-sm font-medium text-foreground">
            {item.envelopeTitle}
          </span>
        </div>

        <div className="sm:col-span-3">
          <p className="truncate text-sm text-foreground">
            {item.signerName}
          </p>
          <p className="truncate text-xs text-foreground-subtle">
            {item.signerEmail}
          </p>
        </div>

        <div className="text-xs text-foreground-muted sm:col-span-2">
          {formatDate(item.envelopeCreatedAt)}
        </div>

        <div className="text-xs text-foreground-muted sm:col-span-2">
          {item.envelopeExpiresAt
            ? formatDate(item.envelopeExpiresAt)
            : '—'}
        </div>

        <div className="sm:col-span-1">
          <button
            type="button"
            onClick={() => onSign(item.accessToken)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-primary/90"
          >
            {signLabel}
            <ExternalLink className="h-3 w-3" />
          </button>
        </div>
      </div>
    </Card>
  );
}

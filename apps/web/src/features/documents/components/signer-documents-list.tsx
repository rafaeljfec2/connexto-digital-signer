'use client';

import type { SignerDocumentResult } from '@/features/documents/api';
import { SignerDocumentRow } from './signer-document-row';

type ColumnLabels = Readonly<{
  document: string;
  signer: string;
  date: string;
  expires: string;
  action: string;
}>;

type SignerDocumentsListProps = Readonly<{
  items: readonly SignerDocumentResult[];
  columns: ColumnLabels;
  signLabel: string;
  formatDate: (value: string) => string;
  onSign: (accessToken: string) => void;
}>;

const COLUMN_HEADER_CLASSES =
  'text-xs font-medium uppercase tracking-wider text-foreground-subtle';

export function SignerDocumentsList({
  items,
  columns,
  signLabel,
  formatDate,
  onSign,
}: SignerDocumentsListProps) {
  return (
    <>
      <div className="hidden border-b border-th-border pb-2 sm:grid sm:grid-cols-12 sm:gap-4 sm:px-4">
        <span className={`col-span-4 ${COLUMN_HEADER_CLASSES}`}>
          {columns.document}
        </span>
        <span className={`col-span-3 ${COLUMN_HEADER_CLASSES}`}>
          {columns.signer}
        </span>
        <span className={`col-span-2 ${COLUMN_HEADER_CLASSES}`}>
          {columns.date}
        </span>
        <span className={`col-span-2 ${COLUMN_HEADER_CLASSES}`}>
          {columns.expires}
        </span>
        <span className={`col-span-1 ${COLUMN_HEADER_CLASSES}`}>
          {columns.action}
        </span>
      </div>

      <div className="space-y-2">
        {items.map((item) => (
          <SignerDocumentRow
            key={item.signerId}
            item={item}
            signLabel={signLabel}
            formatDate={formatDate}
            onSign={onSign}
          />
        ))}
      </div>
    </>
  );
}

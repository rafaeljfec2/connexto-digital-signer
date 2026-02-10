"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { useSignersList } from '@/features/documents/hooks/use-documents';
import { Badge, Pagination, Select, Skeleton } from '@/shared/ui';
import { EmptyState } from '@/features/documents/components/empty-state';
import type { SignerStatus, SignerWithDocument } from '@/features/documents/api';
import { useRouter } from '@/i18n/navigation';
import {
  Calendar,
  ChevronRight,
  Eye,
  FileText,
  Mail,
  MoreVertical,
  User,
} from 'lucide-react';

const STATUS_VARIANT: Record<string, 'default' | 'success' | 'info'> = {
  pending: 'info',
  signed: 'success',
};

const STATUS_ICON_CLASS: Record<string, string> = {
  pending: 'bg-info/15 text-info',
  signed: 'bg-success/15 text-success',
};

export default function SignersManagementPage() {
  const tCommon = useTranslations('common');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<SignerStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const limit = 10;

  const query = useSignersList({
    page,
    limit,
    status: status === 'all' ? undefined : status,
  });

  const formatDate = useCallback(
    (value: string | null) => {
      if (!value) return '—';
      return new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(
        new Date(value),
      );
    },
    [locale],
  );

  const signers = query.data?.data ?? [];

  return (
    <div className="space-y-5">
      <div className="space-y-1">
        <h1 className="text-2xl font-medium text-foreground">
          {tCommon('signersTitle')}
        </h1>
        <p className="text-sm text-foreground-muted">
          {tCommon('signersSubtitle')}
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
        <span>{tCommon('signersFilters.status')}</span>
        <Select
          className="min-w-[180px]"
          value={status}
          onChange={(e) => {
            setStatus(e.target.value as SignerStatus | 'all');
            setPage(1);
          }}
        >
          <option value="all">{tCommon('signersFilters.all')}</option>
          <option value="pending">{tCommon('signersFilters.pending')}</option>
          <option value="signed">{tCommon('signersFilters.signed')}</option>
        </Select>
      </div>

      <div className="glass-card rounded-2xl p-4">
        <SignersTable
          signers={signers}
          isLoading={query.isLoading}
          formatDate={formatDate}
          labels={{
            name: tCommon('signersTable.name'),
            email: tCommon('signersTable.email'),
            document: tCommon('signersTable.document'),
            status: tCommon('signersTable.status'),
            notifiedAt: tCommon('signersTable.notifiedAt'),
            signedAt: tCommon('signersTable.signedAt'),
            statusPending: tCommon('signersFilters.pending'),
            statusSigned: tCommon('signersFilters.signed'),
            viewDocument: tCommon('signersActions.viewDocument'),
            viewSummary: tCommon('signersActions.viewSummary'),
            emptyTitle: tCommon('signersEmptyTitle'),
            emptyDescription: tCommon('signersEmptyDescription'),
          }}
          onViewDocument={(signer) => router.push(`/documents/${signer.documentId}`)}
          onViewSummary={(signer) => router.push(`/documents/${signer.documentId}/summary`)}
        />
      </div>

      <Pagination
        page={query.data?.meta.page ?? page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        previousLabel={tCommon('signersPagination.previous')}
        nextLabel={tCommon('signersPagination.next')}
        pageLabel={tCommon('signersPagination.page')}
      />
    </div>
  );
}

type SignersTableLabels = Readonly<{
  name: string;
  email: string;
  document: string;
  status: string;
  notifiedAt: string;
  signedAt: string;
  statusPending: string;
  statusSigned: string;
  viewDocument: string;
  viewSummary: string;
  emptyTitle: string;
  emptyDescription: string;
}>;

type SignersTableProps = Readonly<{
  signers: ReadonlyArray<SignerWithDocument>;
  isLoading: boolean;
  formatDate: (value: string | null) => string;
  labels: SignersTableLabels;
  onViewDocument: (signer: SignerWithDocument) => void;
  onViewSummary: (signer: SignerWithDocument) => void;
}>;

function SignerRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-full" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
      </div>
      <Skeleton className="hidden h-4 w-28 sm:block" />
      <Skeleton className="hidden h-5 w-16 md:block" />
      <Skeleton className="hidden h-4 w-24 lg:block" />
      <Skeleton className="h-8 w-8" />
    </div>
  );
}

function SignersTable({
  signers,
  isLoading,
  formatDate,
  labels,
  onViewDocument,
  onViewSummary,
}: SignersTableProps) {
  if (!isLoading && signers.length === 0) {
    return (
      <EmptyState title={labels.emptyTitle} description={labels.emptyDescription} />
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-th-border bg-th-card">
      <div className="hidden items-center gap-3 border-b border-th-border bg-th-hover/50 px-4 py-2.5 sm:flex">
        <div className="w-9 shrink-0" />
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {labels.name}
        </p>
        <p className="hidden w-36 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle md:block">
          {labels.document}
        </p>
        <p className="w-20 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {labels.status}
        </p>
        <p className="hidden w-28 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle lg:block">
          {labels.signedAt}
        </p>
        <div className="w-16" />
      </div>

      <div className="divide-y divide-th-border">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <SignerRowSkeleton key={`skeleton-${String(i)}`} />
            ))
          : signers.map((signer) => (
              <SignerRow
                key={signer.id}
                signer={signer}
                labels={labels}
                formatDate={formatDate}
                onViewDocument={onViewDocument}
                onViewSummary={onViewSummary}
              />
            ))}
      </div>
    </div>
  );
}

type SignerRowProps = Readonly<{
  signer: SignerWithDocument;
  labels: SignersTableLabels;
  formatDate: (value: string | null) => string;
  onViewDocument: (signer: SignerWithDocument) => void;
  onViewSummary: (signer: SignerWithDocument) => void;
}>;

function SignerRow({
  signer,
  labels,
  formatDate,
  onViewDocument,
  onViewSummary,
}: SignerRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [menuOpen]);

  const statusLabel =
    signer.status === 'signed' ? labels.statusSigned : labels.statusPending;

  return (
    <div className="group flex w-full items-center gap-3 px-4 py-3 transition-colors hover:bg-th-hover">
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${STATUS_ICON_CLASS[signer.status] ?? STATUS_ICON_CLASS.pending}`}
      >
        <User className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal text-foreground">
          {signer.name}
        </p>
        <p className="mt-0.5 flex items-center gap-1 truncate text-[11px] text-foreground-subtle">
          <Mail className="h-3 w-3 shrink-0" />
          {signer.email}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
          <Badge
            variant={STATUS_VARIANT[signer.status] ?? 'default'}
            className="text-[10px]"
          >
            {statusLabel}
          </Badge>
          {signer.documentTitle ? (
            <span className="flex items-center gap-1 text-[10px] text-foreground-subtle">
              <FileText className="h-3 w-3" />
              {signer.documentTitle}
            </span>
          ) : null}
        </div>
      </div>

      <div className="hidden w-36 md:block">
        <button
          type="button"
          className="flex items-center gap-1.5 truncate text-xs text-foreground-muted transition-colors hover:text-primary"
          onClick={() => onViewDocument(signer)}
        >
          <FileText className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{signer.documentTitle}</span>
        </button>
      </div>

      <div className="hidden sm:block">
        <Badge
          variant={STATUS_VARIANT[signer.status] ?? 'default'}
          className="w-20 justify-center text-[10px]"
        >
          {statusLabel}
        </Badge>
      </div>

      <p className="hidden w-28 text-center text-xs text-foreground-muted lg:block">
        {signer.status === 'signed' ? (
          <span className="flex items-center justify-center gap-1">
            <Calendar className="h-3 w-3" />
            {formatDate(signer.signedAt)}
          </span>
        ) : (
          <span className="text-foreground-subtle">—</span>
        )}
      </p>

      <div ref={menuRef} className="relative flex w-16 items-center justify-end gap-1">
        <button
          type="button"
          className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover hover:text-foreground"
          onClick={() => setMenuOpen((prev) => !prev)}
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {menuOpen ? (
          <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-th-border bg-th-dialog shadow-lg">
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-th-hover"
              onClick={() => {
                setMenuOpen(false);
                onViewDocument(signer);
              }}
            >
              <FileText className="h-4 w-4 shrink-0" />
              {labels.viewDocument}
            </button>
            <button
              type="button"
              className="flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm text-foreground transition-colors hover:bg-th-hover"
              onClick={() => {
                setMenuOpen(false);
                onViewSummary(signer);
              }}
            >
              <Eye className="h-4 w-4 shrink-0" />
              {labels.viewSummary}
            </button>
          </div>
        ) : null}
        <ChevronRight className="hidden h-4 w-4 text-foreground-subtle transition-colors group-hover:text-foreground-muted sm:block" />
      </div>
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { EmptyState } from '@/features/documents/components/empty-state';
import { useDeleteDocument, useDocumentsList } from '@/features/documents/hooks/use-documents';
import { getDocumentFile, getDocumentSignedFile } from '@/features/documents/api';
import { Badge, Button, Card, ConfirmDialog, Pagination, Select, Skeleton } from '@/shared/ui';
import type { DocumentStatus, DocumentSummary } from '@/features/documents/api';
import type { DocumentActionLabels } from '@/features/documents/components/documents-table';
import { useRouter } from '@/i18n/navigation';
import { Calendar, Download, Eye, FileDown, FileText, LayoutGrid, List, MoreVertical, Pencil, Plus, Trash2 } from 'lucide-react';

const GRID_ICON_CLASS: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  pending_signatures: 'bg-info/15 text-info',
  expired: 'bg-error/15 text-error',
  draft: 'bg-th-icon-bg text-th-icon-fg',
};

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function DocumentsPage() {
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [deleteTarget, setDeleteTarget] = useState<DocumentSummary | null>(null);
  const [gridMenuOpenId, setGridMenuOpenId] = useState<string | null>(null);
  const limit = 10;

  const query = useDocumentsList({
    page,
    limit,
    status: status === 'all' ? undefined : status,
  });

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  const statusLabels = useMemo(
    () => ({
      draft: tDocuments('status.draft'),
      pending_signatures: tDocuments('status.pending'),
      completed: tDocuments('status.completed'),
      expired: tDocuments('status.expired'),
    }),
    [tDocuments]
  );

  const actionLabels: DocumentActionLabels = useMemo(
    () => ({
      continue: tDocuments('actions.continue'),
      view: tDocuments('actions.view'),
      viewSummary: tDocuments('actions.viewSummary'),
      downloadOriginal: tDocuments('actions.downloadOriginal'),
      downloadSigned: tDocuments('actions.downloadSigned'),
      delete: tDocuments('actions.delete'),
    }),
    [tDocuments]
  );

  const deleteMutation = useDeleteDocument();

  const handleDocumentClick = useCallback(
    (doc: DocumentSummary) => {
      if (doc.status === 'completed') {
        router.push(`/documents/${doc.id}/summary`);
      } else {
        router.push(`/documents/${doc.id}`);
      }
    },
    [router]
  );

  const handleViewSummary = useCallback(
    (doc: DocumentSummary) => {
      router.push(`/documents/${doc.id}/summary`);
    },
    [router]
  );

  const handleDownloadOriginal = useCallback(async (doc: DocumentSummary) => {
    const blob = await getDocumentFile(doc.id);
    downloadBlob(blob, `${doc.title}.pdf`);
  }, []);

  const handleDownloadSigned = useCallback(async (doc: DocumentSummary) => {
    const blob = await getDocumentSignedFile(doc.id);
    if (blob) {
      downloadBlob(blob, `${doc.title}-signed.pdf`);
    }
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const handleNewDocument = useCallback(() => {
    router.push('/documents/new');
  }, [router]);

  const skeletonCards = useMemo(() => ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'], []);

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-1">
          <h1 className="text-2xl font-medium text-foreground">{tDocuments('title')}</h1>
          <p className="text-sm text-foreground-muted">{tDocuments('subtitle')}</p>
        </div>
        <Button
          type="button"
          variant="primary"
          className="w-full sm:w-auto"
          onClick={handleNewDocument}
        >
          <Plus className="mr-2 h-4 w-4" />
          {tDocuments('actions.newDocument')}
        </Button>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
          <span>{tDocuments('filters.status')}</span>
          <Select
            className="min-w-[200px]"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as DocumentStatus | 'all');
              setPage(1);
            }}
          >
            <option value="all">{tDocuments('filters.all')}</option>
            <option value="draft">{tDocuments('status.draft')}</option>
            <option value="pending_signatures">{tDocuments('status.pending')}</option>
            <option value="completed">{tDocuments('status.completed')}</option>
            <option value="expired">{tDocuments('status.expired')}</option>
          </Select>
          <div className="flex items-center gap-1 rounded-full border border-th-border bg-th-hover p-1">
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                view === 'list'
                  ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
                  : 'text-foreground-muted hover:bg-th-hover hover:text-foreground'
              }`}
              onClick={() => setView('list')}
            >
              <List className="h-4 w-4" />
            </button>
            <button
              type="button"
              className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                view === 'grid'
                  ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
                  : 'text-foreground-muted hover:bg-th-hover hover:text-foreground'
              }`}
              onClick={() => setView('grid')}
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
      {view === 'list' ? (
        <div className="glass-card rounded-2xl p-4">
          <DocumentsTable
            documents={query.data?.data ?? []}
            isLoading={query.isLoading}
            statusLabels={statusLabels}
            headers={{
              title: tDocuments('table.title'),
              status: tDocuments('table.status'),
              created: tDocuments('table.created'),
              actions: tDocuments('table.actions'),
            }}
            emptyTitle={tDocuments('empty.title')}
            emptyDescription={tDocuments('empty.description')}
            formatDate={formatDate}
            actionLabels={actionLabels}
            onDocumentClick={handleDocumentClick}
            onDeleteDocument={setDeleteTarget}
            onDownloadOriginal={handleDownloadOriginal}
            onDownloadSigned={handleDownloadSigned}
            onViewSummary={handleViewSummary}
            deletingId={deleteMutation.isPending ? (deleteMutation.variables ?? null) : null}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
          {query.isLoading
            ? skeletonCards.map((card) => (
                <Card key={card} variant="glass" className="space-y-3 p-5">
                  <div className="flex items-center gap-3">
                    <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                    <div className="flex-1 space-y-1.5">
                      <Skeleton className="h-4 w-3/5" />
                      <Skeleton className="h-3 w-1/3" />
                    </div>
                  </div>
                  <Skeleton className="h-8 w-24" />
                </Card>
              ))
            : (query.data?.data ?? []).map((doc) => (
                <GridDocumentCard
                  key={doc.id}
                  doc={doc}
                  statusLabels={statusLabels}
                  actionLabels={actionLabels}
                  formatDate={formatDate}
                  isMenuOpen={gridMenuOpenId === doc.id}
                  onToggleMenu={(open) => setGridMenuOpenId(open ? doc.id : null)}
                  onDocumentClick={handleDocumentClick}
                  onDeleteDocument={setDeleteTarget}
                  onDownloadOriginal={handleDownloadOriginal}
                  onDownloadSigned={handleDownloadSigned}
                  onViewSummary={handleViewSummary}
                />
              ))}
          {!query.isLoading && (query.data?.data ?? []).length === 0 ? (
            <div className="md:col-span-2 xl:col-span-3">
              <EmptyState
                title={tDocuments('empty.title')}
                description={tDocuments('empty.description')}
              />
            </div>
          ) : null}
        </div>
      )}
      <Pagination
        page={query.data?.meta.page ?? page}
        totalPages={query.data?.meta.totalPages ?? 1}
        onPageChange={setPage}
        previousLabel={tDocuments('pagination.previous')}
        nextLabel={tDocuments('pagination.next')}
        pageLabel={tDocuments('pagination.page')}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={tDocuments('actions.deleteTitle')}
        description={tDocuments('actions.deleteConfirm')}
        confirmLabel={tDocuments('actions.delete')}
        cancelLabel={tDocuments('actions.cancel')}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

const statusLabelsToVariant = (
  status: DocumentStatus
): 'default' | 'success' | 'warning' | 'danger' | 'info' => {
  if (status === 'completed') return 'success';
  if (status === 'pending_signatures') return 'info';
  if (status === 'expired') return 'danger';
  return 'default';
};

type GridActionItem = Readonly<{
  key: string;
  label: string;
  icon: typeof Eye;
  variant?: 'danger';
  onClick: () => void;
}>;

type GridActionHandlers = Readonly<{
  onDocumentClick: (doc: DocumentSummary) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onDownloadOriginal: (doc: DocumentSummary) => void;
  onDownloadSigned: (doc: DocumentSummary) => void;
  onViewSummary: (doc: DocumentSummary) => void;
}>;

function buildSummaryAction(doc: DocumentSummary, labels: DocumentActionLabels, handlers: GridActionHandlers): GridActionItem {
  return { key: 'summary', label: labels.viewSummary, icon: Eye, onClick: () => handlers.onViewSummary(doc) };
}

function buildDownloadOriginalAction(doc: DocumentSummary, labels: DocumentActionLabels, handlers: GridActionHandlers): GridActionItem {
  return { key: 'download-original', label: labels.downloadOriginal, icon: Download, onClick: () => handlers.onDownloadOriginal(doc) };
}

const GRID_ACTIONS_BY_STATUS: Record<DocumentStatus, (doc: DocumentSummary, labels: DocumentActionLabels, handlers: GridActionHandlers) => ReadonlyArray<GridActionItem>> = {
  draft: (doc, labels, handlers) => [
    { key: 'continue', label: labels.continue, icon: Pencil, onClick: () => handlers.onDocumentClick(doc) },
    { key: 'delete', label: labels.delete, icon: Trash2, variant: 'danger', onClick: () => handlers.onDeleteDocument(doc) },
  ],
  pending_signatures: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    buildDownloadOriginalAction(doc, labels, handlers),
  ],
  completed: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    { key: 'download-signed', label: labels.downloadSigned, icon: FileDown, onClick: () => handlers.onDownloadSigned(doc) },
    buildDownloadOriginalAction(doc, labels, handlers),
  ],
  expired: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    buildDownloadOriginalAction(doc, labels, handlers),
  ],
};

function getGridActions(
  doc: DocumentSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): ReadonlyArray<GridActionItem> {
  const builder = GRID_ACTIONS_BY_STATUS[doc.status];
  return builder(doc, labels, handlers);
}

type GridDocumentCardProps = Readonly<{
  doc: DocumentSummary;
  statusLabels: Record<DocumentStatus, string>;
  actionLabels: DocumentActionLabels;
  formatDate: (value: string) => string;
  isMenuOpen: boolean;
  onToggleMenu: (open: boolean) => void;
  onDocumentClick: (doc: DocumentSummary) => void;
  onDeleteDocument: (doc: DocumentSummary) => void;
  onDownloadOriginal: (doc: DocumentSummary) => void;
  onDownloadSigned: (doc: DocumentSummary) => void;
  onViewSummary: (doc: DocumentSummary) => void;
}>;

function GridDocumentCard({
  doc,
  statusLabels,
  actionLabels,
  formatDate,
  isMenuOpen,
  onToggleMenu,
  onDocumentClick,
  onDeleteDocument,
  onDownloadOriginal,
  onDownloadSigned,
  onViewSummary,
}: GridDocumentCardProps) {
  const actions = getGridActions(doc, actionLabels, {
    onDocumentClick,
    onDeleteDocument,
    onDownloadOriginal,
    onDownloadSigned,
    onViewSummary,
  });

  return (
    <Card
      variant="glass"
      className="group cursor-pointer space-y-3 p-5 transition-all hover:border-th-card-border hover:bg-th-hover"
      onClick={() => onDocumentClick(doc)}
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${GRID_ICON_CLASS[doc.status] ?? GRID_ICON_CLASS.draft}`}
        >
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-foreground-subtle">
            <Calendar className="h-3 w-3" />
            {formatDate(doc.createdAt)}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              onToggleMenu(!isMenuOpen);
            }}
          >
            <MoreVertical className="h-4 w-4" />
          </button>
          {isMenuOpen ? (
            <GridDropdown
              actions={actions}
              onClose={() => onToggleMenu(false)}
            />
          ) : null}
        </div>
      </div>
      <div className="flex items-center">
        <Badge variant={statusLabelsToVariant(doc.status)}>
          {statusLabels[doc.status]}
        </Badge>
      </div>
    </Card>
  );
}

type GridDropdownProps = Readonly<{
  actions: ReadonlyArray<GridActionItem>;
  onClose: () => void;
}>;

function GridDropdown({ actions, onClose }: GridDropdownProps) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20"
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        aria-label="Close menu"
      />
      <div className="absolute right-0 top-full z-30 mt-1 min-w-[200px] overflow-hidden rounded-xl border border-th-border bg-th-dialog shadow-lg">
        {actions.map((action) => {
          const Icon = action.icon;
          return (
            <button
              key={action.key}
              type="button"
              className={`flex w-full items-center gap-2.5 px-3.5 py-2.5 text-left text-sm transition-colors ${
                action.variant === 'danger'
                  ? 'text-error hover:bg-error/10'
                  : 'text-foreground hover:bg-th-hover'
              }`}
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                action.onClick();
              }}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {action.label}
            </button>
          );
        })}
      </div>
    </>
  );
}

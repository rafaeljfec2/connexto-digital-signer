"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { usePersistedView } from '@/shared/hooks/use-persisted-view';
import { useLocale, useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { EmptyState } from '@/features/documents/components/empty-state';
import { MoveToFolderModal } from '@/features/documents/components/move-to-folder-modal';
import { GridDocumentCard } from '@/features/documents/components/grid-document-card';
import { SignerTrackingPanel } from '@/features/documents/components/signer-tracking-panel';
import { useDeleteEnvelope, useEnvelopesList } from '@/features/documents/hooks/use-documents';
import { useFolderTree, useMoveEnvelopeToFolder } from '@/features/documents/hooks/use-folders';
import { getDocumentFile, getDocumentSignedFile, getEnvelopeAuditSummary } from '@/features/documents/api';
import type { DocumentStatus, EnvelopeSummary, FolderTreeNode } from '@/features/documents/api';
import type { DocumentActionLabels } from '@/features/documents/components/documents-table';
import { Button, Card, ConfirmDialog, Dialog, Pagination, Select, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import { useRouter } from '@/i18n/navigation';
import { LayoutGrid, List, Plus, Search } from 'lucide-react';

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

function buildFolderNameMap(tree: readonly FolderTreeNode[]): Map<string, string> {
  const map = new Map<string, string>();
  function walk(nodes: readonly FolderTreeNode[]) {
    for (const node of nodes) {
      map.set(node.id, node.name);
      walk(node.children);
    }
  }
  walk(tree);
  return map;
}

type ViewToggleProps = Readonly<{
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}>;

function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const listClass = view === 'list'
    ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
    : 'text-foreground-muted hover:bg-th-hover hover:text-foreground';
  const gridClass = view === 'grid'
    ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
    : 'text-foreground-muted hover:bg-th-hover hover:text-foreground';
  return (
    <div className="flex items-center gap-1 rounded-full border border-th-border bg-th-hover p-1">
      <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${listClass}`} onClick={() => onViewChange('list')}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${gridClass}`} onClick={() => onViewChange('grid')}>
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function DocumentsPage() {
  const t = useTranslations('documents');
  const tTracking = useTranslations('tracking');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = usePersistedView('documents-view');
  const [deleteTarget, setDeleteTarget] = useState<EnvelopeSummary | null>(null);
  const [gridMenuOpenId, setGridMenuOpenId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState<EnvelopeSummary | null>(null);
  const [trackingId, setTrackingId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const searchParams = useSearchParams();
  const limit = 10;

  useEffect(() => {
    const trackParam = searchParams.get('track');
    if (trackParam) {
      setTrackingId(trackParam);
      router.replace('/documents', { scroll: false });
    }
    const searchParam = searchParams.get('search');
    if (searchParam) {
      setSearch(searchParam);
      router.replace('/documents', { scroll: false });
    }
  }, [searchParams, router]);

  const debouncedSearch = useDebounce(search, 400);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearch]);

  const folderTreeQuery = useFolderTree();
  const folderTree = folderTreeQuery.data ?? [];
  const folderNameMap = useMemo(() => buildFolderNameMap(folderTree), [folderTree]);

  const query = useEnvelopesList({
    page,
    limit,
    status: status === 'all' ? undefined : status,
    search: debouncedSearch || undefined,
  });
  const deleteMutation = useDeleteEnvelope();
  const moveMutation = useMoveEnvelopeToFolder();
  const deletingId = deleteMutation.isPending ? (deleteMutation.variables ?? null) : null;
  const envelopes = query.data?.data ?? [];

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  const statusLabels = useMemo(() => ({
    draft: t('status.draft'),
    pending_signatures: t('status.pending'),
    completed: t('status.completed'),
    expired: t('status.expired'),
  }), [t]);

  const actionLabels: DocumentActionLabels = useMemo(() => ({
    continue: t('actions.continue'),
    view: t('actions.view'),
    viewSummary: t('actions.viewSummary'),
    downloadOriginal: t('actions.downloadOriginal'),
    downloadSigned: t('actions.downloadSigned'),
    delete: t('actions.delete'),
    moveToFolder: t('actions.moveToFolder'),
    track: t('actions.track'),
  }), [t]);

  const handleDocumentClick = useCallback((env: EnvelopeSummary) => {
    router.push(env.status === 'completed' ? `/documents/${env.id}/summary` : `/documents/${env.id}`);
  }, [router]);

  const handleViewSummary = useCallback(
    (env: EnvelopeSummary) => router.push(`/documents/${env.id}/summary`),
    [router],
  );

  const handleDownloadOriginal = useCallback(async (env: EnvelopeSummary) => {
    const summary = await getEnvelopeAuditSummary(env.id);
    const blob = await getDocumentFile(summary.document.id);
    downloadBlob(blob, `${env.title}.pdf`);
  }, []);

  const handleDownloadSigned = useCallback(async (env: EnvelopeSummary) => {
    const summary = await getEnvelopeAuditSummary(env.id);
    const blob = await getDocumentSignedFile(summary.document.id);
    if (blob) downloadBlob(blob, `${env.title}-signed.pdf`);
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  }, [deleteTarget, deleteMutation]);

  const handleConfirmMove = useCallback((targetFolderId: string) => {
    if (!moveTarget) return;
    moveMutation.mutate(
      { envelopeId: moveTarget.id, folderId: targetFolderId },
      { onSuccess: () => setMoveTarget(null) },
    );
  }, [moveTarget, moveMutation]);

  return (
    <PageTransition className="space-y-5">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('title')}</h1>
            <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
          </div>
          <Button type="button" variant="primary" className="w-full gap-2 sm:w-auto" onClick={() => router.push('/documents/new')}>
            <Plus className="h-4 w-4" />
            {t('actions.newDocument')}
          </Button>
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t('filters.search')}
              className="h-9 w-full rounded-xl border border-th-border bg-th-input pl-9 pr-4 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <div className="flex flex-wrap items-center gap-3 text-sm text-foreground-muted">
            <span>{t('filters.status')}</span>
            <Select className="min-w-[200px]" value={status} onChange={(e) => { setStatus(e.target.value as DocumentStatus | 'all'); setPage(1); }}>
              <option value="all">{t('filters.all')}</option>
              <option value="draft">{t('status.draft')}</option>
              <option value="pending_signatures">{t('status.pending')}</option>
              <option value="completed">{t('status.completed')}</option>
              <option value="expired">{t('status.expired')}</option>
            </Select>
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div key="list-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="glass-card rounded-2xl p-4">
            <DocumentsTable
              documents={envelopes} isLoading={query.isLoading} statusLabels={statusLabels}
              headers={{ title: t('table.title'), status: t('table.status'), docs: t('table.docs'), folder: t('table.folder'), created: t('table.created'), actions: t('table.actions') }}
              emptyTitle={t('empty.title')} emptyDescription={t('empty.description')}
              formatDate={formatDate} actionLabels={actionLabels} folderNameMap={folderNameMap}
              onDocumentClick={handleDocumentClick} onDeleteDocument={setDeleteTarget}
              onDownloadOriginal={handleDownloadOriginal} onDownloadSigned={handleDownloadSigned}
              onViewSummary={handleViewSummary} onMoveToFolder={setMoveTarget} onTrackDocument={(env) => setTrackingId(env.id)} deletingId={deletingId}
            />
          </motion.div>
        ) : (
          <motion.div key="grid-view" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.2 }} className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {query.isLoading
              ? ['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => (
                  <Card key={id} variant="glass" className="space-y-3 p-5">
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
                      <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-1/3" /></div>
                    </div>
                    <Skeleton className="h-8 w-24" />
                  </Card>
                ))
              : envelopes.map((doc) => (
                  <GridDocumentCard
                    key={doc.id} doc={doc} folderName={folderNameMap.get(doc.folderId)}
                    statusLabels={statusLabels} actionLabels={actionLabels} formatDate={formatDate}
                    isMenuOpen={gridMenuOpenId === doc.id}
                    onToggleMenu={(open) => setGridMenuOpenId(open ? doc.id : null)}
                    onDocumentClick={handleDocumentClick} onDeleteDocument={setDeleteTarget}
                    onDownloadOriginal={handleDownloadOriginal} onDownloadSigned={handleDownloadSigned}
                    onViewSummary={handleViewSummary} onMoveToFolder={setMoveTarget} onTrackDocument={(env) => setTrackingId(env.id)}
                  />
                ))}
            {!query.isLoading && envelopes.length === 0 ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState title={t('empty.title')} description={t('empty.description')} />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

      <Pagination page={query.data?.meta.page ?? page} totalPages={query.data?.meta.totalPages ?? 1} onPageChange={setPage} previousLabel={t('pagination.previous')} nextLabel={t('pagination.next')} pageLabel={t('pagination.page')} />

      <ConfirmDialog open={deleteTarget !== null} title={t('actions.deleteTitle')} description={t('actions.deleteConfirm')} confirmLabel={t('actions.delete')} cancelLabel={t('actions.cancel')} isLoading={deleteMutation.isPending} onConfirm={handleConfirmDelete} onCancel={() => setDeleteTarget(null)} />

      <MoveToFolderModal
        open={moveTarget !== null} folderTree={folderTree} currentFolderId={moveTarget?.folderId ?? null}
        isLoading={moveMutation.isPending} onConfirm={handleConfirmMove} onCancel={() => setMoveTarget(null)}
        labels={{ title: t('folders.moveTitle'), selectFolder: t('folders.selectFolder'), rootFolder: t('folders.rootFolder'), confirm: t('folders.move'), cancel: t('actions.cancel') }}
      />

      <Dialog open={trackingId !== null} title={tTracking('title')} onClose={() => setTrackingId(null)}>
        {trackingId === null ? null : (
          <SignerTrackingPanel envelopeId={trackingId} />
        )}
      </Dialog>
    </PageTransition>
  );
}

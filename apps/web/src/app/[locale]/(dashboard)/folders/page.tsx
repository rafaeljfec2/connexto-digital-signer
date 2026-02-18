"use client";

import { useCallback, useMemo, useState } from 'react';
import { usePersistedView } from '@/shared/hooks/use-persisted-view';
import { useLocale, useTranslations } from 'next-intl';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { FolderBreadcrumb } from '@/features/documents/components/folder-breadcrumb';
import { FolderCardList, FolderCardGrid } from '@/features/documents/components/folder-card';
import { FolderFormModal } from '@/features/documents/components/folder-form-modal';
import { MoveToFolderModal } from '@/features/documents/components/move-to-folder-modal';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { GridDocumentCard } from '@/features/documents/components/grid-document-card';
import { EmptyState } from '@/features/documents/components/empty-state';
import {
  useFolderTree,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveEnvelopeToFolder,
} from '@/features/documents/hooks/use-folders';
import { useDeleteEnvelope, useEnvelopesList } from '@/features/documents/hooks/use-documents';
import { getDocumentFileUrl, getDocumentSignedFileUrl, getEnvelopeAuditSummary } from '@/features/documents/api';
import type { DocumentStatus, EnvelopeSummary, FolderTreeNode } from '@/features/documents/api';
import type { DocumentActionLabels } from '@/features/documents/components/documents-table';
import { Button, Card, ConfirmDialog, Pagination, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import { useRouter } from '@/i18n/navigation';
import {
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  LayoutGrid,
  List,
} from 'lucide-react';

function findSubfolders(
  tree: readonly FolderTreeNode[],
  parentId: string | null,
): FolderTreeNode[] {
  if (parentId === null) return [...tree];
  function search(nodes: readonly FolderTreeNode[]): FolderTreeNode[] | null {
    for (const node of nodes) {
      if (node.id === parentId) return [...node.children];
      const found = search(node.children);
      if (found) return found;
    }
    return null;
  }
  return search(tree) ?? [];
}

function openDownloadUrl(url: string) {
  window.open(url, '_blank', 'noopener,noreferrer');
}

type FolderModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'create' }
  | { readonly mode: 'rename'; readonly folder: FolderTreeNode }
  | { readonly mode: 'delete'; readonly folder: FolderTreeNode };

type MoveModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'folder'; readonly folder: FolderTreeNode }
  | { readonly mode: 'envelope'; readonly envelope: EnvelopeSummary };

type DragState = Readonly<{ type: 'folder' | 'envelope'; id: string; title: string }> | null;

export default function FoldersPage() {
  const t = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = usePersistedView('folders-view');
  const [folderModal, setFolderModal] = useState<FolderModalState>({ mode: 'closed' });
  const [moveModal, setMoveModal] = useState<MoveModalState>({ mode: 'closed' });
  const [activeDrag, setActiveDrag] = useState<DragState>(null);
  const [deleteTarget, setDeleteTarget] = useState<EnvelopeSummary | null>(null);
  const [gridMenuOpenId, setGridMenuOpenId] = useState<string | null>(null);
  const [envelopePage, setEnvelopePage] = useState(1);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const folderTreeQuery = useFolderTree();
  const folderTree = folderTreeQuery.data ?? [];
  const subfolders = useMemo(
    () => findSubfolders(folderTree, currentFolderId),
    [folderTree, currentFolderId],
  );

  const envelopesQuery = useEnvelopesList({
    page: envelopePage,
    limit: 10,
    folderId: currentFolderId ?? undefined,
  });
  const envelopes = envelopesQuery.data?.data ?? [];

  const createMut = useCreateFolder();
  const updateMut = useUpdateFolder();
  const deleteMut = useDeleteFolder();
  const deleteEnvelopeMut = useDeleteEnvelope();
  const moveEnvelopeMut = useMoveEnvelopeToFolder();

  const deletingEnvelopeId = deleteEnvelopeMut.isPending ? (deleteEnvelopeMut.variables ?? null) : null;

  const formatDate = (value: string) =>
    new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(value));

  const menuLabels = useMemo(() => ({
    rename: t('folders.rename'),
    move: t('folders.move'),
    delete: t('folders.delete'),
  }), [t]);

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
  }), [t]);

  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
    setEnvelopePage(1);
  }, []);

  const handleDocumentClick = useCallback((env: EnvelopeSummary) => {
    router.push(env.status === 'completed' ? `/documents/${env.id}/summary` : `/documents/${env.id}`);
  }, [router]);

  const handleViewSummary = useCallback(
    (env: EnvelopeSummary) => router.push(`/documents/${env.id}/summary`),
    [router],
  );

  const handleDownloadOriginal = useCallback(async (env: EnvelopeSummary) => {
    const summary = await getEnvelopeAuditSummary(env.id);
    const result = await getDocumentFileUrl(summary.document.id);
    openDownloadUrl(result.url);
  }, []);

  const handleDownloadSigned = useCallback(async (env: EnvelopeSummary) => {
    const summary = await getEnvelopeAuditSummary(env.id);
    const result = await getDocumentSignedFileUrl(summary.document.id);
    if (result) openDownloadUrl(result.url);
  }, []);

  const handleCreate = useCallback((name: string) => {
    createMut.mutate(
      { name, parentId: currentFolderId ?? undefined },
      { onSuccess: () => setFolderModal({ mode: 'closed' }) },
    );
  }, [createMut, currentFolderId]);

  const handleRename = useCallback((name: string) => {
    if (folderModal.mode !== 'rename') return;
    updateMut.mutate(
      { id: folderModal.folder.id, input: { name } },
      { onSuccess: () => setFolderModal({ mode: 'closed' }) },
    );
  }, [folderModal, updateMut]);

  const handleConfirmDeleteFolder = useCallback(() => {
    if (folderModal.mode !== 'delete') return;
    deleteMut.mutate(folderModal.folder.id, {
      onSuccess: () => setFolderModal({ mode: 'closed' }),
    });
  }, [folderModal, deleteMut]);

  const handleConfirmDeleteEnvelope = useCallback(() => {
    if (!deleteTarget) return;
    deleteEnvelopeMut.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteEnvelopeMut]);

  const handleConfirmMove = useCallback((targetFolderId: string) => {
    if (moveModal.mode === 'folder') {
      updateMut.mutate(
        { id: moveModal.folder.id, input: { parentId: targetFolderId } },
        { onSuccess: () => setMoveModal({ mode: 'closed' }) },
      );
    }
    if (moveModal.mode === 'envelope') {
      moveEnvelopeMut.mutate(
        { envelopeId: moveModal.envelope.id, folderId: targetFolderId },
        { onSuccess: () => setMoveModal({ mode: 'closed' }) },
      );
    }
  }, [moveModal, updateMut, moveEnvelopeMut]);

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const data = event.active.data.current as { type: string; id: string } | undefined;
    if (!data) return;
    if (data.type === 'folder') {
      const folder = subfolders.find((f) => f.id === data.id);
      setActiveDrag({ type: 'folder', id: data.id, title: folder?.name ?? '' });
    }
    if (data.type === 'envelope') {
      const env = envelopes.find((e) => e.id === data.id);
      setActiveDrag({ type: 'envelope', id: data.id, title: env?.title ?? '' });
    }
  }, [subfolders, envelopes]);

  const handleDragEnd = useCallback((event: DragEndEvent) => {
    setActiveDrag(null);
    const { active, over } = event;
    if (!over) return;
    const dragData = active.data.current as { type: string; id: string } | undefined;
    const dropData = over.data.current as { type: string; folderId: string | null } | undefined;
    if (!dragData || dropData?.type !== 'folder') return;
    if (dragData.type === 'folder' && dropData.folderId !== dragData.id) {
      updateMut.mutate({ id: dragData.id, input: { parentId: dropData.folderId ?? undefined } });
    }
    if (dragData.type === 'envelope' && dropData.folderId !== null) {
      moveEnvelopeMut.mutate({ envelopeId: dragData.id, folderId: dropData.folderId });
    }
  }, [updateMut, moveEnvelopeMut]);

  const hasSubfolders = subfolders.length > 0;
  const hasEnvelopes = envelopes.length > 0;
  const isAllEmpty = !folderTreeQuery.isLoading && !envelopesQuery.isLoading && !hasSubfolders && !hasEnvelopes;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <PageTransition className="space-y-5">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('folders.title')}</h1>
            <p className="text-sm text-foreground-muted">{t('folders.subtitle')}</p>
          </div>
          <Button type="button" variant="primary" className="gap-2" onClick={() => setFolderModal({ mode: 'create' })}>
            <FolderPlus className="h-4 w-4" />
            {t('folders.newFolder')}
          </Button>
        </div>
        <div className="flex items-center justify-between gap-3">
          <FolderBreadcrumb
            folderTree={folderTree}
            currentFolderId={currentFolderId}
            onNavigate={handleNavigate}
            rootLabel={t('folders.root')}
          />
          <ViewToggle view={view} onViewChange={setView} />
        </div>
      </FadeIn>

      {isAllEmpty ? (
        <EmptyState title={t('folders.emptyTitle')} description={t('folders.emptyDescription')} />
      ) : null}

      {hasSubfolders ? (
        <FolderSection
          view={view}
          subfolders={subfolders}
          menuLabels={menuLabels}
          onNavigate={handleNavigate}
          onRename={(f) => setFolderModal({ mode: 'rename', folder: f })}
          onMove={(f) => setMoveModal({ mode: 'folder', folder: f })}
          onDelete={(f) => setFolderModal({ mode: 'delete', folder: f })}
        />
      ) : null}

      {currentFolderId === null ? null : (
        <EnvelopeSection
          view={view}
          envelopes={envelopes}
          isLoading={envelopesQuery.isLoading}
          statusLabels={statusLabels}
          actionLabels={actionLabels}
          formatDate={formatDate}
          gridMenuOpenId={gridMenuOpenId}
          deletingId={deletingEnvelopeId}
          page={envelopesQuery.data?.meta.page ?? envelopePage}
          totalPages={envelopesQuery.data?.meta.totalPages ?? 1}
          onPageChange={setEnvelopePage}
          onToggleMenu={setGridMenuOpenId}
          onDocumentClick={handleDocumentClick}
          onDeleteDocument={setDeleteTarget}
          onDownloadOriginal={handleDownloadOriginal}
          onDownloadSigned={handleDownloadSigned}
          onViewSummary={handleViewSummary}
          onMoveToFolder={(env) => setMoveModal({ mode: 'envelope', envelope: env })}
          paginationLabels={{
            previous: t('pagination.previous'),
            next: t('pagination.next'),
            page: t('pagination.page'),
          }}
          tableHeaders={{
            title: t('table.title'),
            status: t('table.status'),
            docs: t('table.docs'),
            folder: t('table.folder'),
            created: t('table.created'),
            actions: t('table.actions'),
          }}
          emptyTitle={t('empty.title')}
          emptyDescription={t('empty.description')}
        />
      )}

      <ConfirmDialog
        open={folderModal.mode === 'delete'}
        title={t('folders.deleteTitle')}
        description={t('folders.deleteConfirm')}
        confirmLabel={t('folders.delete')}
        cancelLabel={t('actions.cancel')}
        isLoading={deleteMut.isPending}
        onConfirm={handleConfirmDeleteFolder}
        onCancel={() => setFolderModal({ mode: 'closed' })}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('actions.deleteTitle')}
        description={t('actions.deleteConfirm')}
        confirmLabel={t('actions.delete')}
        cancelLabel={t('actions.cancel')}
        isLoading={deleteEnvelopeMut.isPending}
        onConfirm={handleConfirmDeleteEnvelope}
        onCancel={() => setDeleteTarget(null)}
      />

      <FolderFormModal
        open={folderModal.mode === 'create'}
        mode="create"
        isLoading={createMut.isPending}
        onConfirm={handleCreate}
        onCancel={() => setFolderModal({ mode: 'closed' })}
        labels={{
          createTitle: t('folders.createTitle'),
          renameTitle: t('folders.renameTitle'),
          placeholder: t('folders.namePlaceholder'),
          confirm: t('folders.newFolder'),
          cancel: t('actions.cancel'),
        }}
      />

      <FolderFormModal
        open={folderModal.mode === 'rename'}
        mode="rename"
        initialName={folderModal.mode === 'rename' ? folderModal.folder.name : ''}
        isLoading={updateMut.isPending}
        onConfirm={handleRename}
        onCancel={() => setFolderModal({ mode: 'closed' })}
        labels={{
          createTitle: t('folders.createTitle'),
          renameTitle: t('folders.renameTitle'),
          placeholder: t('folders.namePlaceholder'),
          confirm: t('folders.rename'),
          cancel: t('actions.cancel'),
        }}
      />

      <MoveToFolderModal
        open={moveModal.mode !== 'closed'}
        folderTree={folderTree}
        currentFolderId={currentFolderId}
        excludeFolderId={moveModal.mode === 'folder' ? moveModal.folder.id : undefined}
        isLoading={updateMut.isPending || moveEnvelopeMut.isPending}
        onConfirm={handleConfirmMove}
        onCancel={() => setMoveModal({ mode: 'closed' })}
        labels={{
          title: t('folders.moveTitle'),
          selectFolder: t('folders.selectFolder'),
          rootFolder: t('folders.rootFolder'),
          confirm: t('folders.move'),
          cancel: t('actions.cancel'),
        }}
      />

      <DragOverlay>
        {activeDrag ? (
          <div className="flex items-center gap-2 rounded-xl border border-th-border bg-th-dialog px-4 py-2.5 shadow-lg">
            {activeDrag.type === 'folder'
              ? <FolderIcon className="h-4 w-4 text-warning" />
              : <FileText className="h-4 w-4 text-primary" />}
            <span className="text-sm font-medium text-foreground">{activeDrag.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </PageTransition>
    </DndContext>
  );
}

type ViewToggleProps = Readonly<{ view: 'list' | 'grid'; onViewChange: (v: 'list' | 'grid') => void }>;

function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  const listCls = view === 'list'
    ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
    : 'text-foreground-muted hover:bg-th-hover hover:text-foreground';
  const gridCls = view === 'grid'
    ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
    : 'text-foreground-muted hover:bg-th-hover hover:text-foreground';
  return (
    <div className="flex items-center gap-1 rounded-full border border-th-border bg-th-hover p-1">
      <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${listCls}`} onClick={() => onViewChange('list')}>
        <List className="h-4 w-4" />
      </button>
      <button type="button" className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${gridCls}`} onClick={() => onViewChange('grid')}>
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

type FolderSectionProps = Readonly<{
  view: 'list' | 'grid';
  subfolders: readonly FolderTreeNode[];
  menuLabels: Readonly<{ rename: string; move: string; delete: string }>;
  onNavigate: (id: string | null) => void;
  onRename: (f: FolderTreeNode) => void;
  onMove: (f: FolderTreeNode) => void;
  onDelete: (f: FolderTreeNode) => void;
}>;

function FolderSection({ view, subfolders, menuLabels, onNavigate, onRename, onMove, onDelete }: FolderSectionProps) {
  if (view === 'list') {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="divide-y divide-th-border rounded-xl border border-th-border bg-th-card">
          {subfolders.map((folder) => (
            <FolderCardList key={folder.id} folder={folder} variant="list" onNavigate={onNavigate} onRename={onRename} onMove={onMove} onDelete={onDelete} menuLabels={menuLabels} />
          ))}
        </div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {subfolders.map((folder) => (
        <FolderCardGrid key={folder.id} folder={folder} variant="grid" onNavigate={onNavigate} onRename={onRename} onMove={onMove} onDelete={onDelete} menuLabels={menuLabels} />
      ))}
    </div>
  );
}

type EnvelopeSectionProps = Readonly<{
  view: 'list' | 'grid';
  envelopes: readonly EnvelopeSummary[];
  isLoading: boolean;
  statusLabels: Record<DocumentStatus, string>;
  actionLabels: DocumentActionLabels;
  formatDate: (v: string) => string;
  gridMenuOpenId: string | null;
  deletingId: string | null;
  page: number;
  totalPages: number;
  onPageChange: (p: number) => void;
  onToggleMenu: (id: string | null) => void;
  onDocumentClick: (d: EnvelopeSummary) => void;
  onDeleteDocument: (d: EnvelopeSummary) => void;
  onDownloadOriginal: (d: EnvelopeSummary) => void;
  onDownloadSigned: (d: EnvelopeSummary) => void;
  onViewSummary: (d: EnvelopeSummary) => void;
  onMoveToFolder: (d: EnvelopeSummary) => void;
  paginationLabels: Readonly<{ previous: string; next: string; page: string }>;
  tableHeaders: Readonly<{ title: string; status: string; docs: string; folder: string; created: string; actions: string }>;
  emptyTitle: string;
  emptyDescription: string;
}>;

function EnvelopeSection({
  view, envelopes, isLoading, statusLabels, actionLabels, formatDate,
  gridMenuOpenId, deletingId, page, totalPages, onPageChange, onToggleMenu,
  onDocumentClick, onDeleteDocument, onDownloadOriginal, onDownloadSigned,
  onViewSummary, onMoveToFolder, paginationLabels, tableHeaders,
  emptyTitle, emptyDescription,
}: EnvelopeSectionProps) {
  if (view === 'list') {
    return (
      <>
        <div className="glass-card rounded-2xl p-4">
          <DocumentsTable
            documents={envelopes} isLoading={isLoading} statusLabels={statusLabels}
            headers={tableHeaders} emptyTitle={emptyTitle} emptyDescription={emptyDescription}
            formatDate={formatDate} actionLabels={actionLabels}
            onDocumentClick={onDocumentClick} onDeleteDocument={onDeleteDocument}
            onDownloadOriginal={onDownloadOriginal} onDownloadSigned={onDownloadSigned}
            onViewSummary={onViewSummary} onMoveToFolder={onMoveToFolder} deletingId={deletingId}
          />
        </div>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange}
          previousLabel={paginationLabels.previous} nextLabel={paginationLabels.next} pageLabel={paginationLabels.page}
        />
      </>
    );
  }

  const gridContent = renderGridContent({
    isLoading, envelopes, statusLabels, actionLabels, formatDate,
    gridMenuOpenId, onToggleMenu, onDocumentClick, onDeleteDocument,
    onDownloadOriginal, onDownloadSigned, onViewSummary, onMoveToFolder,
    emptyTitle, emptyDescription,
  });

  return (
    <>
      {gridContent}
      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange}
        previousLabel={paginationLabels.previous} nextLabel={paginationLabels.next} pageLabel={paginationLabels.page}
      />
    </>
  );
}

type GridContentParams = Readonly<{
  isLoading: boolean;
  envelopes: readonly EnvelopeSummary[];
  statusLabels: Record<DocumentStatus, string>;
  actionLabels: DocumentActionLabels;
  formatDate: (v: string) => string;
  gridMenuOpenId: string | null;
  onToggleMenu: (id: string | null) => void;
  onDocumentClick: (d: EnvelopeSummary) => void;
  onDeleteDocument: (d: EnvelopeSummary) => void;
  onDownloadOriginal: (d: EnvelopeSummary) => void;
  onDownloadSigned: (d: EnvelopeSummary) => void;
  onViewSummary: (d: EnvelopeSummary) => void;
  onMoveToFolder: (d: EnvelopeSummary) => void;
  emptyTitle: string;
  emptyDescription: string;
}>;

function renderGridContent(params: GridContentParams) {
  if (params.isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {['es1', 'es2', 'es3'].map((id) => (
          <Card key={id} variant="glass" className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5"><Skeleton className="h-4 w-3/5" /><Skeleton className="h-3 w-1/3" /></div>
            </div>
            <Skeleton className="h-8 w-24" />
          </Card>
        ))}
      </div>
    );
  }

  if (params.envelopes.length === 0) {
    return <EmptyState title={params.emptyTitle} description={params.emptyDescription} />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {params.envelopes.map((doc) => (
        <GridDocumentCard
          key={doc.id} doc={doc} statusLabels={params.statusLabels} actionLabels={params.actionLabels}
          formatDate={params.formatDate} isMenuOpen={params.gridMenuOpenId === doc.id}
          onToggleMenu={(open) => params.onToggleMenu(open ? doc.id : null)}
          onDocumentClick={params.onDocumentClick} onDeleteDocument={params.onDeleteDocument}
          onDownloadOriginal={params.onDownloadOriginal} onDownloadSigned={params.onDownloadSigned}
          onViewSummary={params.onViewSummary} onMoveToFolder={params.onMoveToFolder}
        />
      ))}
    </div>
  );
}

"use client";

import { useCallback, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { AnimatePresence, motion } from 'framer-motion';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors, useDraggable } from '@dnd-kit/core';
import { DocumentsTable } from '@/features/documents/components/documents-table';
import { EmptyState } from '@/features/documents/components/empty-state';
import { FolderBreadcrumb } from '@/features/documents/components/folder-breadcrumb';
import { FolderCardList, FolderCardGrid } from '@/features/documents/components/folder-card';
import { FolderFormModal } from '@/features/documents/components/folder-form-modal';
import { MoveToFolderModal } from '@/features/documents/components/move-to-folder-modal';
import { useDeleteEnvelope, useEnvelopesList } from '@/features/documents/hooks/use-documents';
import { useFolderTree } from '@/features/documents/hooks/use-folders';
import { useFolderManagement } from '@/features/documents/hooks/use-folder-management';
import { getDocumentFile, getDocumentSignedFile, getEnvelopeAuditSummary } from '@/features/documents/api';
import type { DocumentStatus, EnvelopeSummary, FolderTreeNode } from '@/features/documents/api';
import type { DocumentActionLabels } from '@/features/documents/components/documents-table';
import { Badge, Button, Card, ConfirmDialog, Pagination, Select, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import { useRouter } from '@/i18n/navigation';
import {
  ArrowRight,
  Calendar,
  Download,
  Eye,
  FileDown,
  FileText,
  Folder as FolderIcon,
  FolderPlus,
  LayoutGrid,
  List,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from 'lucide-react';

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

export default function DocumentsPage() {
  const tDocuments = useTranslations('documents');
  const locale = useLocale();
  const router = useRouter();
  const [status, setStatus] = useState<DocumentStatus | 'all'>('all');
  const [page, setPage] = useState(1);
  const [view, setView] = useState<'list' | 'grid'>('list');
  const [deleteTarget, setDeleteTarget] = useState<EnvelopeSummary | null>(null);
  const [gridMenuOpenId, setGridMenuOpenId] = useState<string | null>(null);
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const limit = 10;

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const folderTreeQuery = useFolderTree();
  const folderTree = folderTreeQuery.data ?? [];
  const subfolders = useMemo(
    () => findSubfolders(folderTree, currentFolderId),
    [folderTree, currentFolderId],
  );

  const query = useEnvelopesList({
    page,
    limit,
    status: status === 'all' ? undefined : status,
    folderId: currentFolderId ?? undefined,
  });

  const deleteMutation = useDeleteEnvelope();
  const deletingId = deleteMutation.isPending ? (deleteMutation.variables ?? null) : null;
  const envelopes = query.data?.data ?? [];

  const fm = useFolderManagement({
    currentFolderId,
    subfolders,
    envelopes,
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
    [tDocuments],
  );

  const actionLabels: DocumentActionLabels = useMemo(
    () => ({
      continue: tDocuments('actions.continue'),
      view: tDocuments('actions.view'),
      viewSummary: tDocuments('actions.viewSummary'),
      downloadOriginal: tDocuments('actions.downloadOriginal'),
      downloadSigned: tDocuments('actions.downloadSigned'),
      delete: tDocuments('actions.delete'),
      moveToFolder: tDocuments('actions.moveToFolder'),
    }),
    [tDocuments],
  );

  const folderMenuLabels = useMemo(
    () => ({
      rename: tDocuments('folders.rename'),
      move: tDocuments('folders.move'),
      delete: tDocuments('folders.delete'),
    }),
    [tDocuments],
  );

  const handleNavigateFolder = useCallback(
    (folderId: string | null) => {
      setCurrentFolderId(folderId);
      setPage(1);
    },
    [],
  );

  const handleDocumentClick = useCallback(
    (env: EnvelopeSummary) => {
      const route = env.status === 'completed'
        ? `/documents/${env.id}/summary`
        : `/documents/${env.id}`;
      router.push(route);
    },
    [router],
  );

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
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }, [deleteTarget, deleteMutation]);

  const handleNewDocument = useCallback(() => router.push('/documents/new'), [router]);

  const skeletonCards = useMemo(
    () => ['card-1', 'card-2', 'card-3', 'card-4', 'card-5', 'card-6'],
    [],
  );

  const hasSubfolders = subfolders.length > 0;
  const hasContent = hasSubfolders || envelopes.length > 0;

  return (
    <DndContext sensors={sensors} onDragStart={fm.handleDragStart} onDragEnd={fm.handleDragEnd}>
    <PageTransition className="space-y-5">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{tDocuments('title')}</h1>
            <p className="text-sm text-foreground-muted">{tDocuments('subtitle')}</p>
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="secondary"
              className="gap-2"
              onClick={fm.openCreateFolder}
            >
              <FolderPlus className="h-4 w-4" />
              <span className="hidden sm:inline">{tDocuments('folders.newFolder')}</span>
            </Button>
            <Button
              type="button"
              variant="primary"
              className="gap-2"
              onClick={handleNewDocument}
            >
              <Plus className="h-4 w-4" />
              <span className="hidden sm:inline">{tDocuments('actions.newDocument')}</span>
            </Button>
          </div>
        </div>

        <FolderBreadcrumb
          folderTree={folderTree}
          currentFolderId={currentFolderId}
          onNavigate={handleNavigateFolder}
          rootLabel={tDocuments('folders.root')}
        />

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
            <ViewToggle view={view} onViewChange={setView} />
          </div>
        </div>
      </FadeIn>

      <AnimatePresence mode="wait">
        {view === 'list' ? (
          <motion.div
            key="list-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="glass-card rounded-2xl p-4"
          >
            {hasSubfolders ? (
              <div className="mb-2 rounded-xl border border-th-border bg-th-card divide-y divide-th-border">
                {subfolders.map((folder) => (
                  <FolderCardList
                    key={folder.id}
                    folder={folder}
                    variant="list"
                    onNavigate={handleNavigateFolder}
                    onRename={fm.openRenameFolder}
                    onMove={fm.openMoveFolder}
                    onDelete={fm.openDeleteFolder}
                    menuLabels={folderMenuLabels}
                  />
                ))}
              </div>
            ) : null}
            <DocumentsTable
              documents={envelopes}
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
              onMoveToFolder={fm.openMoveEnvelope}
              deletingId={deletingId}
            />
          </motion.div>
        ) : (
          <motion.div
            key="grid-view"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3"
          >
            {subfolders.map((folder) => (
              <FolderCardGrid
                key={folder.id}
                folder={folder}
                variant="grid"
                onNavigate={handleNavigateFolder}
                onRename={fm.openRenameFolder}
                onMove={fm.openMoveFolder}
                onDelete={fm.openDeleteFolder}
                menuLabels={folderMenuLabels}
              />
            ))}
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
              : envelopes.map((doc) => (
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
                    onMoveToFolder={fm.openMoveEnvelope}
                  />
                ))}
            {!query.isLoading && !hasContent ? (
              <div className="md:col-span-2 xl:col-span-3">
                <EmptyState
                  title={tDocuments('empty.title')}
                  description={tDocuments('empty.description')}
                />
              </div>
            ) : null}
          </motion.div>
        )}
      </AnimatePresence>

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

      <ConfirmDialog
        open={fm.folderModal.mode === 'delete'}
        title={tDocuments('folders.deleteTitle')}
        description={tDocuments('folders.deleteConfirm')}
        confirmLabel={tDocuments('folders.delete')}
        cancelLabel={tDocuments('actions.cancel')}
        isLoading={fm.deleteFolderMutation.isPending}
        onConfirm={fm.handleConfirmDeleteFolder}
        onCancel={fm.closeFolderModal}
      />

      <FolderFormModal
        open={fm.folderModal.mode === 'create'}
        mode="create"
        isLoading={fm.createFolderMutation.isPending}
        onConfirm={fm.handleCreateFolder}
        onCancel={fm.closeFolderModal}
        labels={{
          createTitle: tDocuments('folders.createTitle'),
          renameTitle: tDocuments('folders.renameTitle'),
          placeholder: tDocuments('folders.namePlaceholder'),
          confirm: tDocuments('folders.newFolder'),
          cancel: tDocuments('actions.cancel'),
        }}
      />

      <FolderFormModal
        open={fm.folderModal.mode === 'rename'}
        mode="rename"
        initialName={fm.folderModal.mode === 'rename' ? fm.folderModal.folder.name : ''}
        isLoading={fm.updateFolderMutation.isPending}
        onConfirm={fm.handleRenameFolder}
        onCancel={fm.closeFolderModal}
        labels={{
          createTitle: tDocuments('folders.createTitle'),
          renameTitle: tDocuments('folders.renameTitle'),
          placeholder: tDocuments('folders.namePlaceholder'),
          confirm: tDocuments('folders.rename'),
          cancel: tDocuments('actions.cancel'),
        }}
      />

      <MoveToFolderModal
        open={fm.moveModal.mode !== 'closed'}
        folderTree={folderTree}
        currentFolderId={currentFolderId}
        excludeFolderId={fm.moveModal.mode === 'folder' ? fm.moveModal.folder.id : undefined}
        isLoading={fm.moveEnvelopeMutation.isPending || fm.updateFolderMutation.isPending}
        onConfirm={fm.handleConfirmMove}
        onCancel={fm.closeMoveModal}
        labels={{
          title: tDocuments('folders.moveTitle'),
          selectFolder: tDocuments('folders.selectFolder'),
          rootFolder: tDocuments('folders.rootFolder'),
          confirm: tDocuments('folders.move'),
          cancel: tDocuments('actions.cancel'),
        }}
      />

      <DragOverlay>
        {fm.activeDrag ? (
          <div className="flex items-center gap-2 rounded-xl border border-th-border bg-th-dialog px-4 py-2.5 shadow-lg">
            {fm.activeDrag.type === 'folder' ? (
              <FolderIcon className="h-4 w-4 text-warning" />
            ) : (
              <FileText className="h-4 w-4 text-foreground-muted" />
            )}
            <span className="text-sm font-medium text-foreground">{fm.activeDrag.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </PageTransition>
    </DndContext>
  );
}

type ViewToggleProps = Readonly<{
  view: 'list' | 'grid';
  onViewChange: (view: 'list' | 'grid') => void;
}>;

function ViewToggle({ view, onViewChange }: ViewToggleProps) {
  return (
    <div className="flex items-center gap-1 rounded-full border border-th-border bg-th-hover p-1">
      <button
        type="button"
        className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
          view === 'list'
            ? 'bg-white border border-th-card-border text-foreground shadow-sm dark:bg-white/10'
            : 'text-foreground-muted hover:bg-th-hover hover:text-foreground'
        }`}
        onClick={() => onViewChange('list')}
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
        onClick={() => onViewChange('grid')}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
    </div>
  );
}

const statusLabelsToVariant = (
  status: DocumentStatus,
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
  onDocumentClick: (doc: EnvelopeSummary) => void;
  onDeleteDocument: (doc: EnvelopeSummary) => void;
  onDownloadOriginal: (doc: EnvelopeSummary) => void;
  onDownloadSigned: (doc: EnvelopeSummary) => void;
  onViewSummary: (doc: EnvelopeSummary) => void;
  onMoveToFolder: (doc: EnvelopeSummary) => void;
}>;

function buildSummaryAction(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): GridActionItem {
  return {
    key: 'summary',
    label: labels.viewSummary,
    icon: Eye,
    onClick: () => handlers.onViewSummary(doc),
  };
}

function buildDownloadOriginalAction(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): GridActionItem {
  return {
    key: 'download-original',
    label: labels.downloadOriginal,
    icon: Download,
    onClick: () => handlers.onDownloadOriginal(doc),
  };
}

function buildMoveAction(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): GridActionItem {
  return {
    key: 'move',
    label: labels.moveToFolder ?? 'Move to folder',
    icon: ArrowRight,
    onClick: () => handlers.onMoveToFolder(doc),
  };
}

const GRID_ACTIONS_BY_STATUS: Record<
  DocumentStatus,
  (
    doc: EnvelopeSummary,
    labels: DocumentActionLabels,
    handlers: GridActionHandlers,
  ) => ReadonlyArray<GridActionItem>
> = {
  draft: (doc, labels, handlers) => [
    {
      key: 'continue',
      label: labels.continue,
      icon: Pencil,
      onClick: () => handlers.onDocumentClick(doc),
    },
    buildMoveAction(doc, labels, handlers),
    {
      key: 'delete',
      label: labels.delete,
      icon: Trash2,
      variant: 'danger',
      onClick: () => handlers.onDeleteDocument(doc),
    },
  ],
  pending_signatures: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    buildDownloadOriginalAction(doc, labels, handlers),
    buildMoveAction(doc, labels, handlers),
  ],
  completed: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    {
      key: 'download-signed',
      label: labels.downloadSigned,
      icon: FileDown,
      onClick: () => handlers.onDownloadSigned(doc),
    },
    buildDownloadOriginalAction(doc, labels, handlers),
    buildMoveAction(doc, labels, handlers),
  ],
  expired: (doc, labels, handlers) => [
    buildSummaryAction(doc, labels, handlers),
    buildDownloadOriginalAction(doc, labels, handlers),
    buildMoveAction(doc, labels, handlers),
  ],
};

function getGridActions(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): ReadonlyArray<GridActionItem> {
  const builder = GRID_ACTIONS_BY_STATUS[doc.status];
  return builder(doc, labels, handlers);
}

type GridDocumentCardProps = Readonly<{
  doc: EnvelopeSummary;
  statusLabels: Record<DocumentStatus, string>;
  actionLabels: DocumentActionLabels;
  formatDate: (value: string) => string;
  isMenuOpen: boolean;
  onToggleMenu: (open: boolean) => void;
  onDocumentClick: (doc: EnvelopeSummary) => void;
  onDeleteDocument: (doc: EnvelopeSummary) => void;
  onDownloadOriginal: (doc: EnvelopeSummary) => void;
  onDownloadSigned: (doc: EnvelopeSummary) => void;
  onViewSummary: (doc: EnvelopeSummary) => void;
  onMoveToFolder: (doc: EnvelopeSummary) => void;
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
  onMoveToFolder,
}: GridDocumentCardProps) {
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `drag-envelope-${doc.id}`,
    data: { type: 'envelope', id: doc.id },
  });

  const actions = getGridActions(doc, actionLabels, {
    onDocumentClick,
    onDeleteDocument,
    onDownloadOriginal,
    onDownloadSigned,
    onViewSummary,
    onMoveToFolder,
  });

  return (
    <Card
      ref={setNodeRef}
      variant="glass"
      className={`group cursor-pointer space-y-3 p-5 transition-all hover:border-th-card-border hover:bg-th-hover ${isDragging ? 'opacity-50' : ''}`}
      onClick={() => onDocumentClick(doc)}
      {...attributes}
      {...listeners}
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
            <GridDropdown actions={actions} onClose={() => onToggleMenu(false)} />
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Badge variant={statusLabelsToVariant(doc.status)}>
          {statusLabels[doc.status]}
        </Badge>
        {doc.documentCount > 1 ? (
          <Badge variant="default" className="text-[10px]">
            {doc.documentCount} docs
          </Badge>
        ) : null}
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

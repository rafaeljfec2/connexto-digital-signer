"use client";

import { useCallback, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DndContext, DragOverlay, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import { FolderBreadcrumb } from '@/features/documents/components/folder-breadcrumb';
import { FolderCardList, FolderCardGrid } from '@/features/documents/components/folder-card';
import { FolderFormModal } from '@/features/documents/components/folder-form-modal';
import { MoveToFolderModal } from '@/features/documents/components/move-to-folder-modal';
import { EmptyState } from '@/features/documents/components/empty-state';
import {
  useFolderTree,
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
} from '@/features/documents/hooks/use-folders';
import type { FolderTreeNode } from '@/features/documents/api';
import { Button, Card, ConfirmDialog, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import {
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

type FolderModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'create' }
  | { readonly mode: 'rename'; readonly folder: FolderTreeNode }
  | { readonly mode: 'delete'; readonly folder: FolderTreeNode };

type MoveModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'folder'; readonly folder: FolderTreeNode };

type DragState = Readonly<{
  type: 'folder';
  id: string;
  title: string;
}> | null;

type FoldersContentProps = Readonly<{
  isLoading: boolean;
  isEmpty: boolean;
  view: 'list' | 'grid';
  subfolders: readonly FolderTreeNode[];
  menuLabels: Readonly<{ rename: string; move: string; delete: string }>;
  emptyTitle: string;
  emptyDescription: string;
  onNavigate: (folderId: string | null) => void;
  onRename: (folder: FolderTreeNode) => void;
  onMove: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
}>;

function FoldersContent({
  isLoading,
  isEmpty,
  view,
  subfolders,
  menuLabels,
  emptyTitle,
  emptyDescription,
  onNavigate,
  onRename,
  onMove,
  onDelete,
}: FoldersContentProps) {
  if (isLoading) {
    return view === 'grid' ? (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {['s1', 's2', 's3', 's4', 's5', 's6'].map((id) => (
          <Card key={id} variant="glass" className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          </Card>
        ))}
      </div>
    ) : (
      <div className="glass-card rounded-2xl p-4">
        <div className="divide-y divide-th-border rounded-xl border border-th-border bg-th-card">
          {['s1', 's2', 's3', 's4', 's5'].map((id) => (
            <div key={id} className="flex items-center gap-3 px-4 py-3">
              <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (isEmpty) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  if (view === 'list') {
    return (
      <div className="glass-card rounded-2xl p-4">
        <div className="divide-y divide-th-border rounded-xl border border-th-border bg-th-card">
          {subfolders.map((folder) => (
            <FolderCardList
              key={folder.id}
              folder={folder}
              variant="list"
              onNavigate={onNavigate}
              onRename={onRename}
              onMove={onMove}
              onDelete={onDelete}
              menuLabels={menuLabels}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {subfolders.map((folder) => (
        <FolderCardGrid
          key={folder.id}
          folder={folder}
          variant="grid"
          onNavigate={onNavigate}
          onRename={onRename}
          onMove={onMove}
          onDelete={onDelete}
          menuLabels={menuLabels}
        />
      ))}
    </div>
  );
}

export default function FoldersPage() {
  const t = useTranslations('documents');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [view, setView] = useState<'list' | 'grid'>('grid');
  const [folderModal, setFolderModal] = useState<FolderModalState>({ mode: 'closed' });
  const [moveModal, setMoveModal] = useState<MoveModalState>({ mode: 'closed' });
  const [activeDrag, setActiveDrag] = useState<DragState>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
  );

  const folderTreeQuery = useFolderTree();
  const folderTree = folderTreeQuery.data ?? [];
  const subfolders = useMemo(
    () => findSubfolders(folderTree, currentFolderId),
    [folderTree, currentFolderId],
  );

  const createMut = useCreateFolder();
  const updateMut = useUpdateFolder();
  const deleteMut = useDeleteFolder();

  const menuLabels = useMemo(
    () => ({
      rename: t('folders.rename'),
      move: t('folders.move'),
      delete: t('folders.delete'),
    }),
    [t],
  );

  const handleNavigate = useCallback((folderId: string | null) => {
    setCurrentFolderId(folderId);
  }, []);

  const handleCreate = useCallback(
    (name: string) => {
      createMut.mutate(
        { name, parentId: currentFolderId ?? undefined },
        { onSuccess: () => setFolderModal({ mode: 'closed' }) },
      );
    },
    [createMut, currentFolderId],
  );

  const handleRename = useCallback(
    (name: string) => {
      if (folderModal.mode !== 'rename') return;
      updateMut.mutate(
        { id: folderModal.folder.id, input: { name } },
        { onSuccess: () => setFolderModal({ mode: 'closed' }) },
      );
    },
    [folderModal, updateMut],
  );

  const handleConfirmDelete = useCallback(() => {
    if (folderModal.mode !== 'delete') return;
    deleteMut.mutate(folderModal.folder.id, {
      onSuccess: () => setFolderModal({ mode: 'closed' }),
    });
  }, [folderModal, deleteMut]);

  const handleConfirmMove = useCallback(
    (targetFolderId: string) => {
      if (moveModal.mode !== 'folder') return;
      updateMut.mutate(
        { id: moveModal.folder.id, input: { parentId: targetFolderId } },
        { onSuccess: () => setMoveModal({ mode: 'closed' }) },
      );
    },
    [moveModal, updateMut],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const data = event.active.data.current as { type: string; id: string } | undefined;
      if (data?.type !== 'folder') return;
      const folder = subfolders.find((f) => f.id === data.id);
      setActiveDrag({ type: 'folder', id: data.id, title: folder?.name ?? '' });
    },
    [subfolders],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;
      const dragData = active.data.current as { type: string; id: string } | undefined;
      const dropData = over.data.current as { type: string; folderId: string | null } | undefined;
      if (dragData?.type !== 'folder' || dropData?.type !== 'folder') return;
      if (dropData.folderId === dragData.id) return;
      updateMut.mutate({ id: dragData.id, input: { parentId: dropData.folderId ?? undefined } });
    },
    [updateMut],
  );

  const isEmpty = !folderTreeQuery.isLoading && subfolders.length === 0;

  return (
    <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
    <PageTransition className="space-y-5">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('folders.title')}</h1>
            <p className="text-sm text-foreground-muted">{t('folders.subtitle')}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="gap-2"
            onClick={() => setFolderModal({ mode: 'create' })}
          >
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
      </FadeIn>

      <FoldersContent
        isLoading={folderTreeQuery.isLoading}
        isEmpty={isEmpty}
        view={view}
        subfolders={subfolders}
        menuLabels={menuLabels}
        emptyTitle={t('folders.emptyTitle')}
        emptyDescription={t('folders.emptyDescription')}
        onNavigate={handleNavigate}
        onRename={(f) => setFolderModal({ mode: 'rename', folder: f })}
        onMove={(f) => setMoveModal({ mode: 'folder', folder: f })}
        onDelete={(f) => setFolderModal({ mode: 'delete', folder: f })}
      />

      <ConfirmDialog
        open={folderModal.mode === 'delete'}
        title={t('folders.deleteTitle')}
        description={t('folders.deleteConfirm')}
        confirmLabel={t('folders.delete')}
        cancelLabel={t('actions.cancel')}
        isLoading={deleteMut.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setFolderModal({ mode: 'closed' })}
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
        isLoading={updateMut.isPending}
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
            <FolderIcon className="h-4 w-4 text-warning" />
            <span className="text-sm font-medium text-foreground">{activeDrag.title}</span>
          </div>
        ) : null}
      </DragOverlay>
    </PageTransition>
    </DndContext>
  );
}

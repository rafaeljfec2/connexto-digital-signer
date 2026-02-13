import { useCallback, useState } from 'react';
import type { DragEndEvent, DragStartEvent } from '@dnd-kit/core';
import type { EnvelopeSummary, FolderTreeNode } from '../api';
import {
  useCreateFolder,
  useUpdateFolder,
  useDeleteFolder,
  useMoveEnvelopeToFolder,
} from './use-folders';

type FolderModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'create' }
  | { readonly mode: 'rename'; readonly folder: FolderTreeNode }
  | { readonly mode: 'delete'; readonly folder: FolderTreeNode };

type MoveModalState =
  | { readonly mode: 'closed' }
  | { readonly mode: 'envelope'; readonly envelope: EnvelopeSummary }
  | { readonly mode: 'folder'; readonly folder: FolderTreeNode };

type DragState = Readonly<{
  type: 'envelope' | 'folder';
  id: string;
  title: string;
}> | null;

type UseFolderManagementParams = Readonly<{
  currentFolderId: string | null;
  subfolders: readonly FolderTreeNode[];
  envelopes: readonly EnvelopeSummary[];
}>;

export function useFolderManagement({
  currentFolderId,
  subfolders,
  envelopes,
}: UseFolderManagementParams) {
  const [folderModal, setFolderModal] = useState<FolderModalState>({ mode: 'closed' });
  const [moveModal, setMoveModal] = useState<MoveModalState>({ mode: 'closed' });
  const [activeDrag, setActiveDrag] = useState<DragState>(null);

  const createFolderMutation = useCreateFolder();
  const updateFolderMutation = useUpdateFolder();
  const deleteFolderMutation = useDeleteFolder();
  const moveEnvelopeMutation = useMoveEnvelopeToFolder();

  const openCreateFolder = useCallback(() => setFolderModal({ mode: 'create' }), []);
  const openRenameFolder = useCallback((folder: FolderTreeNode) => setFolderModal({ mode: 'rename', folder }), []);
  const openDeleteFolder = useCallback((folder: FolderTreeNode) => setFolderModal({ mode: 'delete', folder }), []);
  const openMoveEnvelope = useCallback((env: EnvelopeSummary) => setMoveModal({ mode: 'envelope', envelope: env }), []);
  const openMoveFolder = useCallback((folder: FolderTreeNode) => setMoveModal({ mode: 'folder', folder }), []);
  const closeFolderModal = useCallback(() => setFolderModal({ mode: 'closed' }), []);
  const closeMoveModal = useCallback(() => setMoveModal({ mode: 'closed' }), []);

  const handleCreateFolder = useCallback(
    (name: string) => {
      createFolderMutation.mutate(
        { name, parentId: currentFolderId ?? undefined },
        { onSuccess: () => setFolderModal({ mode: 'closed' }) },
      );
    },
    [createFolderMutation, currentFolderId],
  );

  const handleRenameFolder = useCallback(
    (name: string) => {
      if (folderModal.mode !== 'rename') return;
      updateFolderMutation.mutate(
        { id: folderModal.folder.id, input: { name } },
        { onSuccess: () => setFolderModal({ mode: 'closed' }) },
      );
    },
    [folderModal, updateFolderMutation],
  );

  const handleConfirmDeleteFolder = useCallback(() => {
    if (folderModal.mode !== 'delete') return;
    deleteFolderMutation.mutate(folderModal.folder.id, {
      onSuccess: () => setFolderModal({ mode: 'closed' }),
    });
  }, [folderModal, deleteFolderMutation]);

  const handleConfirmMove = useCallback(
    (targetFolderId: string) => {
      if (moveModal.mode === 'envelope') {
        moveEnvelopeMutation.mutate(
          { envelopeId: moveModal.envelope.id, folderId: targetFolderId },
          { onSuccess: () => setMoveModal({ mode: 'closed' }) },
        );
      }
      if (moveModal.mode === 'folder') {
        updateFolderMutation.mutate(
          { id: moveModal.folder.id, input: { parentId: targetFolderId } },
          { onSuccess: () => setMoveModal({ mode: 'closed' }) },
        );
      }
    },
    [moveModal, moveEnvelopeMutation, updateFolderMutation],
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const { active } = event;
      const data = active.data.current as { type: string; id: string } | undefined;
      if (!data) return;
      if (data.type === 'envelope') {
        const env = envelopes.find((e) => e.id === data.id);
        setActiveDrag({ type: 'envelope', id: data.id, title: env?.title ?? '' });
      }
      if (data.type === 'folder') {
        const folder = subfolders.find((f) => f.id === data.id);
        setActiveDrag({ type: 'folder', id: data.id, title: folder?.name ?? '' });
      }
    },
    [subfolders, envelopes],
  );

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      setActiveDrag(null);
      const { active, over } = event;
      if (!over) return;

      const dragData = active.data.current as { type: string; id: string } | undefined;
      const dropData = over.data.current as { type: string; folderId: string | null } | undefined;
      if (!dragData || dropData?.type !== 'folder') return;

      const targetFolderId = dropData.folderId;

      if (dragData.type === 'envelope' && targetFolderId !== null) {
        moveEnvelopeMutation.mutate({ envelopeId: dragData.id, folderId: targetFolderId });
      }
      if (dragData.type === 'folder' && targetFolderId !== dragData.id) {
        updateFolderMutation.mutate({ id: dragData.id, input: { parentId: targetFolderId ?? undefined } });
      }
    },
    [moveEnvelopeMutation, updateFolderMutation],
  );

  return {
    folderModal,
    moveModal,
    activeDrag,
    createFolderMutation,
    updateFolderMutation,
    deleteFolderMutation,
    moveEnvelopeMutation,
    openCreateFolder,
    openRenameFolder,
    openDeleteFolder,
    openMoveEnvelope,
    openMoveFolder,
    closeFolderModal,
    closeMoveModal,
    handleCreateFolder,
    handleRenameFolder,
    handleConfirmDeleteFolder,
    handleConfirmMove,
    handleDragStart,
    handleDragEnd,
  };
}

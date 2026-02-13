'use client';

import { useMemo } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { ChevronRight, Home } from 'lucide-react';
import type { FolderTreeNode } from '../api';

type FolderBreadcrumbProps = Readonly<{
  folderTree: readonly FolderTreeNode[];
  currentFolderId: string | null;
  onNavigate: (folderId: string | null) => void;
  rootLabel: string;
}>;

function buildPath(
  tree: readonly FolderTreeNode[],
  targetId: string | null,
): { id: string; name: string }[] {
  if (targetId === null) return [];

  const path: { id: string; name: string }[] = [];

  function search(
    nodes: readonly FolderTreeNode[],
    trail: { id: string; name: string }[],
  ): boolean {
    for (const node of nodes) {
      const current = [...trail, { id: node.id, name: node.name }];
      if (node.id === targetId) {
        path.push(...current);
        return true;
      }
      if (search(node.children, current)) return true;
    }
    return false;
  }

  search(tree, []);
  return path;
}

type DroppableBreadcrumbSegmentProps = Readonly<{
  id: string;
  droppableId: string;
  isActive: boolean;
  onClick: () => void;
  children: React.ReactNode;
}>;

function DroppableBreadcrumbSegment({
  droppableId,
  isActive,
  onClick,
  children,
}: DroppableBreadcrumbSegmentProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: droppableId,
    data: { type: 'folder', folderId: droppableId.replace('breadcrumb-', '') || null },
  });

  const computeClassName = (): string => {
    if (isOver) return 'rounded-lg px-2 py-1 transition-colors bg-primary/15 ring-2 ring-primary/30';
    if (isActive) return 'rounded-lg px-2 py-1 transition-colors font-medium text-foreground';
    return 'rounded-lg px-2 py-1 transition-colors text-foreground-muted hover:bg-th-hover hover:text-foreground';
  };

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={onClick}
      className={computeClassName()}
    >
      {children}
    </button>
  );
}

export function FolderBreadcrumb({
  folderTree,
  currentFolderId,
  onNavigate,
  rootLabel,
}: FolderBreadcrumbProps) {
  const breadcrumbPath = useMemo(
    () => buildPath(folderTree, currentFolderId),
    [folderTree, currentFolderId],
  );

  const isAtRoot = currentFolderId === null;

  const { setNodeRef: rootRef, isOver: isOverRoot } = useDroppable({
    id: 'breadcrumb-root',
    data: { type: 'folder', folderId: null },
  });

  const computeRootClassName = (): string => {
    const base = 'flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-1 transition-colors';
    if (isOverRoot) return `${base} bg-primary/15 ring-2 ring-primary/30`;
    if (isAtRoot) return `${base} font-medium text-foreground`;
    return `${base} text-foreground-muted hover:bg-th-hover hover:text-foreground`;
  };

  return (
    <nav
      aria-label="Folder navigation"
      className="flex items-center gap-1 overflow-x-auto text-sm"
    >
      <button
        ref={rootRef}
        type="button"
        onClick={() => onNavigate(null)}
        className={computeRootClassName()}
      >
        <Home className="h-3.5 w-3.5" />
        {rootLabel}
      </button>

      {breadcrumbPath.map((segment, index) => {
        const isLast = index === breadcrumbPath.length - 1;
        return (
          <span key={segment.id} className="flex shrink-0 items-center gap-1">
            <ChevronRight className="h-3.5 w-3.5 text-foreground-subtle" />
            <DroppableBreadcrumbSegment
              id={segment.id}
              droppableId={`breadcrumb-${segment.id}`}
              isActive={isLast}
              onClick={() => onNavigate(segment.id)}
            >
              {segment.name}
            </DroppableBreadcrumbSegment>
          </span>
        );
      })}
    </nav>
  );
}

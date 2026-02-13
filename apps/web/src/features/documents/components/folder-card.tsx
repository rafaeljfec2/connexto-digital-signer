'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { Folder as FolderIcon, MoreVertical, Pencil, ArrowRight, Trash2 } from 'lucide-react';
import type { FolderTreeNode } from '../api';

type FolderCardProps = Readonly<{
  folder: FolderTreeNode;
  variant: 'list' | 'grid';
  onNavigate: (folderId: string) => void;
  onRename: (folder: FolderTreeNode) => void;
  onMove: (folder: FolderTreeNode) => void;
  onDelete: (folder: FolderTreeNode) => void;
}>;

type FolderMenuProps = Readonly<{
  onRename: () => void;
  onMove: () => void;
  onDelete: () => void;
  labels: Readonly<{
    rename: string;
    move: string;
    delete: string;
  }>;
}>;

function FolderMenu({ onRename, onMove, onDelete, labels }: FolderMenuProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (ref.current && !ref.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  const actions = [
    { key: 'rename', label: labels.rename, icon: Pencil, onClick: onRename },
    { key: 'move', label: labels.move, icon: ArrowRight, onClick: onMove },
    { key: 'delete', label: labels.delete, icon: Trash2, variant: 'danger' as const, onClick: onDelete },
  ];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover hover:text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {open ? (
        <div className="absolute right-0 top-full z-30 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-th-border bg-th-dialog shadow-lg">
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
                  setOpen(false);
                  action.onClick();
                }}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {action.label}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

export function FolderCardList({
  folder,
  onNavigate,
  onRename,
  onMove,
  onDelete,
  menuLabels,
}: FolderCardProps & { readonly menuLabels: FolderMenuProps['labels'] }) {
  const { setNodeRef: dragRef, attributes, listeners, isDragging } = useDraggable({
    id: `drag-folder-${folder.id}`,
    data: { type: 'folder', id: folder.id },
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      dragRef(node);
      dropRef(node);
    },
    [dragRef, dropRef],
  );

  return (
    <button
      ref={setRefs}
      type="button"
      onClick={() => onNavigate(folder.id)}
      className={`group flex w-full cursor-pointer items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-th-hover ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
        <FolderIcon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal text-foreground">{folder.name}</p>
        {folder.children.length > 0 ? (
          <p className="text-[11px] text-foreground-subtle">
            {folder.children.length} {folder.children.length === 1 ? 'subfolder' : 'subfolders'}
          </p>
        ) : null}
      </div>
      <FolderMenu
        onRename={() => onRename(folder)}
        onMove={() => onMove(folder)}
        onDelete={() => onDelete(folder)}
        labels={menuLabels}
      />
    </button>
  );
}

export function FolderCardGrid({
  folder,
  onNavigate,
  onRename,
  onMove,
  onDelete,
  menuLabels,
}: FolderCardProps & { readonly menuLabels: FolderMenuProps['labels'] }) {
  const { setNodeRef: dragRef, attributes, listeners, isDragging } = useDraggable({
    id: `drag-folder-${folder.id}`,
    data: { type: 'folder', id: folder.id },
  });

  const { setNodeRef: dropRef, isOver } = useDroppable({
    id: `drop-folder-${folder.id}`,
    data: { type: 'folder', folderId: folder.id },
  });

  const setRefs = useCallback(
    (node: HTMLElement | null) => {
      dragRef(node);
      dropRef(node);
    },
    [dragRef, dropRef],
  );

  return (
    <button
      ref={setRefs}
      type="button"
      onClick={() => onNavigate(folder.id)}
      className={`group cursor-pointer space-y-3 rounded-2xl border border-th-card-border bg-th-card p-5 text-left transition-all hover:border-th-card-border hover:bg-th-hover ${
        isOver ? 'bg-primary/10 ring-2 ring-primary/30' : ''
      } ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-warning/15 text-warning">
          <FolderIcon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{folder.name}</p>
          {folder.children.length > 0 ? (
            <p className="mt-0.5 text-[11px] text-foreground-subtle">
              {folder.children.length} {folder.children.length === 1 ? 'subfolder' : 'subfolders'}
            </p>
          ) : null}
        </div>
        <FolderMenu
          onRename={() => onRename(folder)}
          onMove={() => onMove(folder)}
          onDelete={() => onDelete(folder)}
          labels={menuLabels}
        />
      </div>
    </button>
  );
}

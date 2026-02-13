'use client';

import { useState } from 'react';
import { ChevronRight, Folder as FolderIcon } from 'lucide-react';
import { Button, Dialog } from '@/shared/ui';
import type { FolderTreeNode } from '../api';

type MoveToFolderModalProps = Readonly<{
  open: boolean;
  folderTree: readonly FolderTreeNode[];
  currentFolderId: string | null;
  excludeFolderId?: string;
  isLoading?: boolean;
  onConfirm: (folderId: string) => void;
  onCancel: () => void;
  labels: Readonly<{
    title: string;
    selectFolder: string;
    rootFolder: string;
    confirm: string;
    cancel: string;
  }>;
}>;

type FolderNodeProps = Readonly<{
  node: FolderTreeNode;
  depth: number;
  selectedId: string | null;
  excludeId?: string;
  onSelect: (id: string) => void;
}>;

function FolderNode({ node, depth, selectedId, excludeId, onSelect }: FolderNodeProps) {
  const [expanded, setExpanded] = useState(true);
  const isSelected = selectedId === node.id;
  const isExcluded = excludeId === node.id;
  const hasChildren = node.children.length > 0;

  if (isExcluded) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-left text-sm transition-colors ${
          isSelected
            ? 'bg-primary/10 font-medium text-primary'
            : 'text-foreground hover:bg-th-hover'
        }`}
        style={{ paddingLeft: `${depth * 20 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="flex h-4 w-4 shrink-0 items-center justify-center"
            onClick={(e) => {
              e.stopPropagation();
              setExpanded((prev) => !prev);
            }}
          >
            <ChevronRight
              className={`h-3 w-3 transition-transform ${expanded ? 'rotate-90' : ''}`}
            />
          </button>
        ) : (
          <span className="h-4 w-4" />
        )}
        <FolderIcon className="h-4 w-4 shrink-0 text-warning" />
        <span className="truncate">{node.name}</span>
      </button>
      {expanded && hasChildren
        ? node.children.map((child) => (
            <FolderNode
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              excludeId={excludeId}
              onSelect={onSelect}
            />
          ))
        : null}
    </div>
  );
}

export function MoveToFolderModal({
  open,
  folderTree,
  currentFolderId,
  excludeFolderId,
  isLoading = false,
  onConfirm,
  onCancel,
  labels,
}: MoveToFolderModalProps) {
  const [selectedId, setSelectedId] = useState<string | null>(currentFolderId);

  const handleConfirm = () => {
    if (selectedId === null) return;
    onConfirm(selectedId);
  };

  return (
    <Dialog
      open={open}
      title={labels.title}
      onClose={onCancel}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onCancel} disabled={isLoading}>
            {labels.cancel}
          </Button>
          <Button
            type="button"
            onClick={handleConfirm}
            disabled={selectedId === null || isLoading}
            isLoading={isLoading}
          >
            {labels.confirm}
          </Button>
        </div>
      }
    >
      <div className="space-y-1">
        <p className="mb-3 text-xs text-foreground-muted">{labels.selectFolder}</p>
        <div className="max-h-[300px] overflow-y-auto rounded-lg border border-th-border p-2">
          {folderTree.map((node) => (
            <FolderNode
              key={node.id}
              node={node}
              depth={0}
              selectedId={selectedId}
              excludeId={excludeFolderId}
              onSelect={setSelectedId}
            />
          ))}
        </div>
      </div>
    </Dialog>
  );
}

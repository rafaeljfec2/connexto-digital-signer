'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useDraggable } from '@dnd-kit/core';
import {
  FileText,
  Calendar,
  ChevronRight,
  MoreVertical,
  Download,
  Eye,
  Trash2,
  Pencil,
  FileDown,
  ArrowRight,
} from 'lucide-react';
import { Badge, Skeleton } from '@/shared/ui';
import type { DocumentStatus, EnvelopeSummary } from '../api';
import { EmptyState } from './empty-state';

type DocumentAction = Readonly<{
  key: string;
  label: string;
  icon: typeof Eye;
  variant?: 'danger';
  onClick: () => void;
}>;

export type DocumentActionLabels = Readonly<{
  continue: string;
  view: string;
  viewSummary: string;
  downloadOriginal: string;
  downloadSigned: string;
  delete: string;
  moveToFolder?: string;
}>;

export type DocumentsTableProps = Readonly<{
  documents: ReadonlyArray<EnvelopeSummary>;
  isLoading?: boolean;
  statusLabels: Record<DocumentStatus, string>;
  headers: Readonly<{
    title: string;
    status: string;
    created: string;
    actions: string;
  }>;
  emptyTitle: string;
  emptyDescription?: string;
  formatDate: (value: string) => string;
  actionLabels: DocumentActionLabels;
  onDocumentClick: (doc: EnvelopeSummary) => void;
  onDeleteDocument?: (doc: EnvelopeSummary) => void;
  onDownloadOriginal?: (doc: EnvelopeSummary) => void;
  onDownloadSigned?: (doc: EnvelopeSummary) => void;
  onViewSummary?: (doc: EnvelopeSummary) => void;
  onMoveToFolder?: (doc: EnvelopeSummary) => void;
  deletingId?: string | null;
}>;

const STATUS_VARIANT: Record<
  DocumentStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  draft: 'default',
  pending_signatures: 'info',
  completed: 'success',
  expired: 'danger',
};

const STATUS_ICON_CLASS: Record<DocumentStatus, string> = {
  draft: 'bg-th-icon-bg text-th-icon-fg',
  pending_signatures: 'bg-info/15 text-info',
  completed: 'bg-success/15 text-success',
  expired: 'bg-error/15 text-error',
};

function DocumentRowSkeleton() {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <Skeleton className="h-9 w-9 shrink-0 rounded-lg" />
      <div className="min-w-0 flex-1 space-y-1.5">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-24" />
      </div>
      <Skeleton className="hidden h-5 w-20 sm:block" />
      <Skeleton className="h-8 w-20" />
    </div>
  );
}

type ActionHandlers = Readonly<{
  onDocumentClick: (doc: EnvelopeSummary) => void;
  onDeleteDocument?: (doc: EnvelopeSummary) => void;
  onDownloadOriginal?: (doc: EnvelopeSummary) => void;
  onDownloadSigned?: (doc: EnvelopeSummary) => void;
  onViewSummary?: (doc: EnvelopeSummary) => void;
  onMoveToFolder?: (doc: EnvelopeSummary) => void;
}>;

function buildMoveAction(doc: EnvelopeSummary, labels: DocumentActionLabels, handlers: ActionHandlers): DocumentAction[] {
  if (!handlers.onMoveToFolder || !labels.moveToFolder) return [];
  return [{ key: 'move', label: labels.moveToFolder, icon: ArrowRight, onClick: () => handlers.onMoveToFolder?.(doc) }];
}

function buildDraftActions(doc: EnvelopeSummary, labels: DocumentActionLabels, handlers: ActionHandlers): ReadonlyArray<DocumentAction> {
  return [
    { key: 'continue', label: labels.continue, icon: Pencil, onClick: () => handlers.onDocumentClick(doc) },
    ...buildMoveAction(doc, labels, handlers),
    ...(handlers.onDeleteDocument
      ? [{ key: 'delete', label: labels.delete, icon: Trash2, variant: 'danger' as const, onClick: () => handlers.onDeleteDocument?.(doc) }]
      : []),
  ];
}

function buildViewableActions(doc: EnvelopeSummary, labels: DocumentActionLabels, handlers: ActionHandlers, includeSigned: boolean): ReadonlyArray<DocumentAction> {
  return [
    ...(handlers.onViewSummary
      ? [{ key: 'summary', label: labels.viewSummary, icon: Eye, onClick: () => handlers.onViewSummary?.(doc) }]
      : []),
    ...(includeSigned && handlers.onDownloadSigned
      ? [{ key: 'download-signed', label: labels.downloadSigned, icon: FileDown, onClick: () => handlers.onDownloadSigned?.(doc) }]
      : []),
    ...(handlers.onDownloadOriginal
      ? [{ key: 'download-original', label: labels.downloadOriginal, icon: Download, onClick: () => handlers.onDownloadOriginal?.(doc) }]
      : []),
    ...buildMoveAction(doc, labels, handlers),
  ];
}

const ACTIONS_BY_STATUS: Record<DocumentStatus, (doc: EnvelopeSummary, labels: DocumentActionLabels, handlers: ActionHandlers) => ReadonlyArray<DocumentAction>> = {
  draft: buildDraftActions,
  pending_signatures: (doc, labels, handlers) => buildViewableActions(doc, labels, handlers, false),
  completed: (doc, labels, handlers) => buildViewableActions(doc, labels, handlers, true),
  expired: (doc, labels, handlers) => buildViewableActions(doc, labels, handlers, false),
};

function useDocumentActions(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: ActionHandlers,
): ReadonlyArray<DocumentAction> {
  const builder = ACTIONS_BY_STATUS[doc.status];
  return builder(doc, labels, handlers);
}

type ActionsDropdownProps = Readonly<{
  actions: ReadonlyArray<DocumentAction>;
}>;

function ActionsDropdown({ actions }: ActionsDropdownProps) {
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

  if (actions.length === 0) return null;

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

export function DocumentsTable({
  documents,
  isLoading = false,
  statusLabels,
  headers,
  emptyTitle,
  emptyDescription,
  formatDate,
  actionLabels,
  onDocumentClick,
  onDeleteDocument,
  onDownloadOriginal,
  onDownloadSigned,
  onViewSummary,
  onMoveToFolder,
  deletingId = null,
}: DocumentsTableProps) {
  const handlers = { onDocumentClick, onDeleteDocument, onDownloadOriginal, onDownloadSigned, onViewSummary, onMoveToFolder };

  if (!isLoading && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl border border-th-border bg-th-card">
      <div className="hidden items-center gap-3 rounded-t-xl border-b border-th-border bg-th-hover/50 px-4 py-2.5 sm:flex">
        <div className="w-9 shrink-0" />
        <p className="min-w-0 flex-1 text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {headers.title}
        </p>
        <p className="w-24 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle">
          {headers.status}
        </p>
        <p className="hidden w-32 text-center text-[10px] font-medium uppercase tracking-widest text-foreground-subtle md:block">
          {headers.created}
        </p>
        <div className="w-20" />
      </div>

      <div className="divide-y divide-th-border">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <DocumentRowSkeleton key={`skeleton-${String(i)}`} />
            ))
          : documents.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                statusLabels={statusLabels}
                formatDate={formatDate}
                actionLabels={actionLabels}
                handlers={handlers}
                isDeleting={deletingId === doc.id}
              />
            ))}
      </div>
    </div>
  );
}

type DocumentRowProps = Readonly<{
  doc: EnvelopeSummary;
  statusLabels: Record<DocumentStatus, string>;
  formatDate: (value: string) => string;
  actionLabels: DocumentActionLabels;
  handlers: Readonly<{
    onDocumentClick: (doc: EnvelopeSummary) => void;
    onDeleteDocument?: (doc: EnvelopeSummary) => void;
    onDownloadOriginal?: (doc: EnvelopeSummary) => void;
    onDownloadSigned?: (doc: EnvelopeSummary) => void;
    onViewSummary?: (doc: EnvelopeSummary) => void;
    onMoveToFolder?: (doc: EnvelopeSummary) => void;
  }>;
  isDeleting: boolean;
}>;

function DocumentRow({ doc, statusLabels, formatDate, actionLabels, handlers, isDeleting }: DocumentRowProps) {
  const actions = useDocumentActions(doc, actionLabels, handlers);
  const { setNodeRef, attributes, listeners, isDragging } = useDraggable({
    id: `drag-envelope-list-${doc.id}`,
    data: { type: 'envelope', id: doc.id },
  });

  return (
    <button
      ref={setNodeRef}
      type="button"
      onClick={() => handlers.onDocumentClick(doc)}
      className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-th-hover ${isDeleting ? 'pointer-events-none opacity-50' : 'cursor-pointer'} ${isDragging ? 'opacity-50' : ''}`}
      {...attributes}
      {...listeners}
    >
      <div
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${STATUS_ICON_CLASS[doc.status]}`}
      >
        <FileText className="h-4 w-4" />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-normal text-foreground">
          {doc.title}
        </p>
        <div className="flex items-center gap-2 sm:hidden">
          <Badge
            variant={STATUS_VARIANT[doc.status]}
            className="mt-1 text-[10px]"
          >
            {statusLabels[doc.status]}
          </Badge>
          {doc.documentCount > 1 ? (
            <Badge variant="default" className="mt-1 text-[10px]">
              {doc.documentCount} docs
            </Badge>
          ) : null}
        </div>
        <p className="mt-0.5 flex items-center gap-1 text-[11px] text-foreground-subtle md:hidden">
          <Calendar className="h-3 w-3" />
          {formatDate(doc.createdAt)}
        </p>
      </div>

      <div className="hidden items-center gap-2 sm:flex">
        <Badge
          variant={STATUS_VARIANT[doc.status]}
          className="w-24 justify-center text-[10px]"
        >
          {statusLabels[doc.status]}
        </Badge>
        {doc.documentCount > 1 ? (
          <Badge variant="default" className="text-[10px]">
            {doc.documentCount} docs
          </Badge>
        ) : null}
      </div>

      <p className="hidden w-32 text-center text-xs text-foreground-muted md:block">
        {formatDate(doc.createdAt)}
      </p>

      <div className="flex w-20 items-center justify-end gap-1">
        <ActionsDropdown actions={actions} />
        <ChevronRight className="hidden h-4 w-4 text-foreground-subtle transition-colors group-hover:text-foreground-muted sm:block" />
      </div>
    </button>
  );
}

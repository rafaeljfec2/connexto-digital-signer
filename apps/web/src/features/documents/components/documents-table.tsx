'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FileText,
  Folder as FolderIcon,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  ChevronsUpDown,
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

type SortColumn = 'title' | 'status' | 'docs' | 'folder' | 'created';
type SortDirection = 'asc' | 'desc';
type SortState = Readonly<{ column: SortColumn; direction: SortDirection }>;

const STATUS_ORDER: Record<DocumentStatus, number> = {
  draft: 0,
  pending_signatures: 1,
  completed: 2,
  expired: 3,
};

function sortDocuments(
  documents: ReadonlyArray<EnvelopeSummary>,
  sort: SortState,
  folderNameMap?: Map<string, string>,
): ReadonlyArray<EnvelopeSummary> {
  const sorted = [...documents];
  const dir = sort.direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    switch (sort.column) {
      case 'title':
        return dir * a.title.localeCompare(b.title);
      case 'status':
        return dir * ((STATUS_ORDER[a.status] ?? 0) - (STATUS_ORDER[b.status] ?? 0));
      case 'docs':
        return dir * (a.documentCount - b.documentCount);
      case 'folder': {
        const fa = folderNameMap?.get(a.folderId) ?? '';
        const fb = folderNameMap?.get(b.folderId) ?? '';
        return dir * fa.localeCompare(fb);
      }
      case 'created':
        return dir * (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      default:
        return 0;
    }
  });

  return sorted;
}

function toggleSort(current: SortState, column: SortColumn): SortState {
  if (current.column === column) {
    return { column, direction: current.direction === 'asc' ? 'desc' : 'asc' };
  }
  return { column, direction: 'asc' };
}

type SortIconProps = Readonly<{ column: SortColumn; sort: SortState }>;

function SortIcon({ column, sort }: SortIconProps) {
  if (sort.column !== column) {
    return <ChevronsUpDown className="h-3 w-3 text-foreground-subtle/50" />;
  }
  return sort.direction === 'asc'
    ? <ChevronUp className="h-3 w-3 text-primary" />
    : <ChevronDown className="h-3 w-3 text-primary" />;
}

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
    docs: string;
    folder: string;
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
  folderNameMap?: Map<string, string>;
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
      <Skeleton className="hidden h-5 w-12 md:block" />
      <Skeleton className="hidden h-5 w-24 lg:block" />
      <Skeleton className="hidden h-5 w-28 md:block" />
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

const DEFAULT_SORT: SortState = { column: 'created', direction: 'desc' };

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
  folderNameMap,
}: DocumentsTableProps) {
  const handlers = { onDocumentClick, onDeleteDocument, onDownloadOriginal, onDownloadSigned, onViewSummary, onMoveToFolder };
  const [sort, setSort] = useState<SortState>(DEFAULT_SORT);

  const sortedDocuments = useMemo(
    () => sortDocuments(documents, sort, folderNameMap),
    [documents, sort, folderNameMap],
  );

  const handleSort = useCallback((column: SortColumn) => {
    setSort((prev) => toggleSort(prev, column));
  }, []);

  if (!isLoading && documents.length === 0) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className="rounded-xl border border-th-border bg-th-card">
      <div className="hidden items-center gap-3 rounded-t-xl border-b border-th-border bg-th-hover/50 px-4 py-2.5 sm:flex">
        <div className="w-9 shrink-0" />
        <SortableHeader column="title" label={headers.title} sort={sort} onSort={handleSort} className="min-w-0 flex-1" />
        <SortableHeader column="status" label={headers.status} sort={sort} onSort={handleSort} className="w-24 justify-center" />
        <SortableHeader column="docs" label={headers.docs} sort={sort} onSort={handleSort} className="hidden w-14 justify-center md:flex" />
        <SortableHeader column="folder" label={headers.folder} sort={sort} onSort={handleSort} className="hidden w-28 justify-center lg:flex" />
        <SortableHeader column="created" label={headers.created} sort={sort} onSort={handleSort} className="hidden w-32 justify-center md:flex" />
        <div className="w-20" />
      </div>

      <div className="divide-y divide-th-border">
        {isLoading
          ? Array.from({ length: 5 }, (_, i) => (
              <DocumentRowSkeleton key={`skeleton-${String(i)}`} />
            ))
          : sortedDocuments.map((doc) => (
              <DocumentRow
                key={doc.id}
                doc={doc}
                statusLabels={statusLabels}
                formatDate={formatDate}
                actionLabels={actionLabels}
                handlers={handlers}
                isDeleting={deletingId === doc.id}
                folderName={folderNameMap?.get(doc.folderId)}
              />
            ))}
      </div>
    </div>
  );
}

type SortableHeaderProps = Readonly<{
  column: SortColumn;
  label: string;
  sort: SortState;
  onSort: (column: SortColumn) => void;
  className?: string;
}>;

function SortableHeader({ column, label, sort, onSort, className = '' }: SortableHeaderProps) {
  const isActive = sort.column === column;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={`flex items-center gap-1 text-[10px] font-medium uppercase tracking-widest transition-colors ${
        isActive ? 'text-primary' : 'text-foreground-subtle hover:text-foreground-muted'
      } ${className}`}
    >
      {label}
      <SortIcon column={column} sort={sort} />
    </button>
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
  folderName?: string;
}>;

function DocumentRow({ doc, statusLabels, formatDate, actionLabels, handlers, isDeleting, folderName }: DocumentRowProps) {
  const actions = useDocumentActions(doc, actionLabels, handlers);

  return (
    <button
      type="button"
      onClick={() => handlers.onDocumentClick(doc)}
      className={`group flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-th-hover ${isDeleting ? 'pointer-events-none opacity-50' : 'cursor-pointer'}`}
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
        <div className="mt-0.5 flex flex-wrap items-center gap-2 sm:hidden">
          <Badge variant={STATUS_VARIANT[doc.status]} className="text-[10px]">
            {statusLabels[doc.status]}
          </Badge>
          {doc.documentCount > 1 ? (
            <Badge variant="default" className="text-[10px]">
              {doc.documentCount} docs
            </Badge>
          ) : null}
          {folderName ? (
            <span className="flex items-center gap-1 text-[10px] text-foreground-subtle">
              <FolderIcon className="h-3 w-3" />
              {folderName}
            </span>
          ) : null}
          <span className="flex items-center gap-1 text-[11px] text-foreground-subtle">
            <Calendar className="h-3 w-3" />
            {formatDate(doc.createdAt)}
          </span>
        </div>
      </div>

      <Badge
        variant={STATUS_VARIANT[doc.status]}
        className="hidden w-24 justify-center text-[10px] sm:flex"
      >
        {statusLabels[doc.status]}
      </Badge>

      <p className="hidden w-14 text-center text-xs text-foreground-muted md:block">
        {doc.documentCount > 1 ? `${doc.documentCount}` : '1'}
      </p>

      <p className="hidden w-28 truncate text-center text-xs text-foreground-muted lg:block">
        {folderName ? (
          <span className="inline-flex items-center gap-1">
            <FolderIcon className="h-3 w-3 shrink-0" />
            {folderName}
          </span>
        ) : (
          <span className="text-foreground-subtle/50">—</span>
        )}
      </p>

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

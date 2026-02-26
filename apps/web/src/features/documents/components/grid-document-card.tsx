'use client';

import { useMemo } from 'react';
import {
  FileText,
  Folder as FolderIcon,
  Calendar,
  MoreVertical,
  Download,
  FileSignature,
  Eye,
  Trash2,
  Pencil,
  FileDown,
  ArrowRight,
  Activity,
} from 'lucide-react';
import { Badge, Card } from '@/shared/ui';
import type { DocumentStatus, EnvelopeSummary } from '../api';
import type { DocumentActionLabels } from './documents-table';

const TRACKABLE_STATUSES = new Set<DocumentStatus>(['pending_signatures', 'completed']);

const GRID_ICON_CLASS: Record<string, string> = {
  completed: 'bg-success/15 text-success',
  pending_signatures: 'bg-info/15 text-info',
  expired: 'bg-error/15 text-error',
  draft: 'bg-th-icon-bg text-th-icon-fg',
};

const STATUS_TO_VARIANT: Record<
  DocumentStatus,
  'default' | 'success' | 'warning' | 'danger' | 'info'
> = {
  draft: 'default',
  pending_signatures: 'info',
  completed: 'success',
  expired: 'danger',
};

type GridAction = Readonly<{
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
  onDownloadP7s?: (doc: EnvelopeSummary) => void;
  onViewSummary: (doc: EnvelopeSummary) => void;
  onMoveToFolder: (doc: EnvelopeSummary) => void;
  onTrackDocument?: (doc: EnvelopeSummary) => void;
}>;

function buildGridActions(
  doc: EnvelopeSummary,
  labels: DocumentActionLabels,
  handlers: GridActionHandlers,
): readonly GridAction[] {
  const move: GridAction = {
    key: 'move',
    label: labels.moveToFolder ?? 'Move to folder',
    icon: ArrowRight,
    onClick: () => handlers.onMoveToFolder(doc),
  };

  switch (doc.status) {
    case 'draft':
      return [
        { key: 'continue', label: labels.continue, icon: Pencil, onClick: () => handlers.onDocumentClick(doc) },
        move,
        { key: 'delete', label: labels.delete, icon: Trash2, variant: 'danger', onClick: () => handlers.onDeleteDocument(doc) },
      ];
    case 'pending_signatures': {
      const track: GridAction[] = handlers.onTrackDocument && labels.track
        ? [{ key: 'track', label: labels.track, icon: Activity, onClick: () => handlers.onTrackDocument?.(doc) }]
        : [];
      return [
        ...track,
        { key: 'summary', label: labels.viewSummary, icon: Eye, onClick: () => handlers.onViewSummary(doc) },
        { key: 'download-original', label: labels.downloadOriginal, icon: Download, onClick: () => handlers.onDownloadOriginal(doc) },
        move,
      ];
    }
    case 'completed': {
      const track: GridAction[] = handlers.onTrackDocument && labels.track
        ? [{ key: 'track', label: labels.track, icon: Activity, onClick: () => handlers.onTrackDocument?.(doc) }]
        : [];
      return [
        ...track,
        { key: 'summary', label: labels.viewSummary, icon: Eye, onClick: () => handlers.onViewSummary(doc) },
        { key: 'download-signed', label: labels.downloadSigned, icon: FileDown, onClick: () => handlers.onDownloadSigned(doc) },
        ...(handlers.onDownloadP7s && labels.downloadP7s
          ? [{ key: 'download-p7s', label: labels.downloadP7s, icon: FileSignature, onClick: () => handlers.onDownloadP7s?.(doc) }]
          : []),
        { key: 'download-original', label: labels.downloadOriginal, icon: Download, onClick: () => handlers.onDownloadOriginal(doc) },
        move,
      ];
    }
    case 'expired':
      return [
        { key: 'summary', label: labels.viewSummary, icon: Eye, onClick: () => handlers.onViewSummary(doc) },
        { key: 'download-original', label: labels.downloadOriginal, icon: Download, onClick: () => handlers.onDownloadOriginal(doc) },
        move,
      ];
    default:
      return [move];
  }
}

export type GridDocumentCardProps = Readonly<{
  doc: EnvelopeSummary;
  folderName?: string;
  statusLabels: Record<DocumentStatus, string>;
  actionLabels: DocumentActionLabels;
  formatDate: (value: string) => string;
  isMenuOpen: boolean;
  onToggleMenu: (open: boolean) => void;
  onDocumentClick: (doc: EnvelopeSummary) => void;
  onDeleteDocument: (doc: EnvelopeSummary) => void;
  onDownloadOriginal: (doc: EnvelopeSummary) => void;
  onDownloadSigned: (doc: EnvelopeSummary) => void;
  onDownloadP7s?: (doc: EnvelopeSummary) => void;
  onViewSummary: (doc: EnvelopeSummary) => void;
  onMoveToFolder: (doc: EnvelopeSummary) => void;
  onTrackDocument?: (doc: EnvelopeSummary) => void;
}>;

export function GridDocumentCard({
  doc,
  folderName,
  statusLabels,
  actionLabels,
  formatDate,
  isMenuOpen,
  onToggleMenu,
  onDocumentClick,
  onDeleteDocument,
  onDownloadOriginal,
  onDownloadSigned,
  onDownloadP7s,
  onViewSummary,
  onMoveToFolder,
  onTrackDocument,
}: GridDocumentCardProps) {
  const handlers: GridActionHandlers = useMemo(
    () => ({ onDocumentClick, onDeleteDocument, onDownloadOriginal, onDownloadSigned, onDownloadP7s, onViewSummary, onMoveToFolder, onTrackDocument }),
    [onDocumentClick, onDeleteDocument, onDownloadOriginal, onDownloadSigned, onDownloadP7s, onViewSummary, onMoveToFolder, onTrackDocument],
  );

  const actions = useMemo(
    () => buildGridActions(doc, actionLabels, handlers),
    [doc, actionLabels, handlers],
  );

  return (
    <Card
      variant="glass"
      className="group cursor-pointer space-y-3 p-5 transition-all hover:border-th-card-border hover:bg-th-hover"
      onClick={() => onDocumentClick(doc)}
    >
      <div className="flex items-start gap-3">
        <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${GRID_ICON_CLASS[doc.status] ?? GRID_ICON_CLASS.draft}`}>
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-foreground">{doc.title}</p>
          <p className="mt-0.5 flex items-center gap-1 text-[11px] text-foreground-subtle">
            <Calendar className="h-3 w-3" />
            {formatDate(doc.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-0.5">
          {TRACKABLE_STATUSES.has(doc.status) && onTrackDocument ? (
            <button
              type="button"
              title={actionLabels.track}
              className="flex h-8 w-8 items-center justify-center rounded-lg text-primary/60 transition-colors hover:bg-primary/10 hover:text-primary"
              onClick={(e) => { e.stopPropagation(); onTrackDocument(doc); }}
            >
              <Activity className="h-4 w-4" />
            </button>
          ) : null}
          <div className="relative">
            <button
              type="button"
              className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); onToggleMenu(!isMenuOpen); }}
            >
              <MoreVertical className="h-4 w-4" />
            </button>
            {isMenuOpen ? (
              <GridDropdown actions={actions} onClose={() => onToggleMenu(false)} />
            ) : null}
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant={STATUS_TO_VARIANT[doc.status]}>
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
      </div>
    </Card>
  );
}

type GridDropdownProps = Readonly<{
  actions: readonly GridAction[];
  onClose: () => void;
}>;

function GridDropdown({ actions, onClose }: GridDropdownProps) {
  return (
    <>
      <button
        type="button"
        className="fixed inset-0 z-20"
        onClick={(e) => { e.stopPropagation(); onClose(); }}
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
              onClick={(e) => { e.stopPropagation(); onClose(); action.onClick(); }}
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

'use client';

import { Badge, Card } from '@/shared/ui';
import {
  CalendarDays,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Download,
  FileBadge,
  FileSignature,
  FileText,
  Globe,
  Loader2,
  Mail,
  Monitor,
  Send,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useCallback, useState } from 'react';
import type { DocumentAuditSummary } from '../api';

function openDownloadUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

type AuditDocumentItem = Readonly<{
  id: string;
  title: string;
}>;

type DocumentAuditViewProps = Readonly<{
  data: DocumentAuditSummary;
  documents?: readonly AuditDocumentItem[];
  onDownloadOriginal: (documentId?: string) => Promise<{ url: string }>;
  onDownloadSigned: (documentId?: string) => Promise<{ url: string } | null>;
  onDownloadP7s?: (documentId?: string) => Promise<{ url: string } | null>;
  labels: Readonly<{
    title: string;
    documentDetails: string;
    signingMode: string;
    signingModeParallel: string;
    signingModeSequential: string;
    createdAt: string;
    expiresAt: string;
    completedAt: string;
    noExpiry: string;
    statusLabels: Readonly<Record<string, string>>;
    hashes: string;
    originalHash: string;
    signedHash: string;
    hashUnavailable: string;
    copied: string;
    copy: string;
    timeline: string;
    eventsFormat: Readonly<{
      sent: (name: string) => string;
      signed: (name: string) => string;
      completed: () => string;
      verified: (name: string) => string;
    }>;
    signers: string;
    signerCard: Readonly<{
      signedAt: string;
      notifiedAt: string;
      ip: string;
      userAgent: string;
      authMethod: string;
      authMethodEmail: string;
      authMethodNone: string;
      verifiedAt: string;
      pending: string;
      signed: string;
    }>;
    downloads: string;
    downloadOriginal: string;
    downloadOriginalDesc: string;
    downloadSigned: string;
    downloadSignedDesc: string;
    downloadSignedUnavailable: string;
    downloadP7s: string;
    downloadP7sDesc: string;
    downloading: string;
  }>;
}>;

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleString();
}

function CopyableHash({
  label,
  hash,
  labels,
}: Readonly<{
  label: string;
  hash: string | null;
  labels: Readonly<{ hashUnavailable: string; copied: string; copy: string }>;
}>) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (!hash) return;
    navigator.clipboard.writeText(hash);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [hash]);

  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-foreground-muted">{label}</p>
      {hash ? (
        <button
          type="button"
          onClick={handleCopy}
          className="group flex w-full items-center gap-2 rounded-lg bg-th-hover px-3 py-2 text-left transition-colors hover:bg-th-active"
        >
          <code className="min-w-0 flex-1 truncate text-xs text-foreground-muted">{hash}</code>
          {copied ? (
            <Check className="h-3.5 w-3.5 shrink-0 text-success" />
          ) : (
            <Copy className="h-3.5 w-3.5 shrink-0 text-foreground-subtle transition-colors group-hover:text-foreground-muted" />
          )}
        </button>
      ) : (
        <p className="px-3 py-2 text-xs text-foreground-subtle">{labels.hashUnavailable}</p>
      )}
    </div>
  );
}

const TIMELINE_ICONS: Record<string, typeof Send> = {
  sent: Send,
  signed: CheckCircle2,
  completed: ShieldCheck,
  verified: UserCheck,
};

const TIMELINE_COLORS: Record<string, string> = {
  sent: 'bg-primary/20 text-primary',
  signed: 'bg-success/20 text-success',
  completed: 'bg-success/20 text-success',
  verified: 'bg-violet-400/20 text-violet-400',
};

function SingleDocDownload({
  docTitle,
  documentId,
  isCompleted,
  onDownloadOriginal,
  onDownloadSigned,
  onDownloadP7s,
  labels,
}: Readonly<{
  docTitle: string;
  documentId?: string;
  isCompleted: boolean;
  onDownloadOriginal: (documentId?: string) => Promise<{ url: string }>;
  onDownloadSigned: (documentId?: string) => Promise<{ url: string } | null>;
  onDownloadP7s?: (documentId?: string) => Promise<{ url: string } | null>;
  labels: Readonly<{
    downloadOriginal: string;
    downloadOriginalDesc: string;
    downloadSigned: string;
    downloadSignedDesc: string;
    downloadSignedUnavailable: string;
    downloadP7s: string;
    downloadP7sDesc: string;
  }>;
}>) {
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [downloadingSigned, setDownloadingSigned] = useState(false);
  const [downloadingP7s, setDownloadingP7s] = useState(false);

  const handleDownloadOriginal = useCallback(async () => {
    setDownloadingOriginal(true);
    try {
      const result = await onDownloadOriginal(documentId);
      openDownloadUrl(result.url);
    } finally {
      setDownloadingOriginal(false);
    }
  }, [onDownloadOriginal, documentId]);

  const handleDownloadSigned = useCallback(async () => {
    setDownloadingSigned(true);
    try {
      const result = await onDownloadSigned(documentId);
      if (result) {
        openDownloadUrl(result.url);
      }
    } finally {
      setDownloadingSigned(false);
    }
  }, [onDownloadSigned, documentId]);

  const handleDownloadP7s = useCallback(async () => {
    if (!onDownloadP7s) return;
    setDownloadingP7s(true);
    try {
      const result = await onDownloadP7s(documentId);
      if (result) {
        openDownloadUrl(result.url);
      }
    } finally {
      setDownloadingP7s(false);
    }
  }, [onDownloadP7s, documentId]);

  const signedDescription = isCompleted ? labels.downloadSignedDesc : labels.downloadSignedUnavailable;
  const signedIconClass = isCompleted ? 'text-success' : 'text-foreground-subtle';
  const signedIconBackground = isCompleted ? 'bg-success/20' : 'bg-th-icon-bg';
  const p7sDescription = isCompleted ? labels.downloadP7sDesc : labels.downloadSignedUnavailable;
  const p7sIconClass = isCompleted ? 'text-primary' : 'text-foreground-subtle';
  const p7sIconBackground = isCompleted ? 'bg-primary/20' : 'bg-th-icon-bg';
  const downloadIconClass = (enabled: boolean) =>
    enabled ? 'text-foreground-subtle' : 'text-foreground-subtle/50';

  return (
    <div className="space-y-3">
      <DownloadAction
        title={labels.downloadOriginal}
        description={labels.downloadOriginalDesc}
        icon={FileText}
        iconClassName="text-primary"
        iconBackgroundClassName="bg-primary/20"
        loading={downloadingOriginal}
        disabled={downloadingOriginal}
        downloadIconClassName={downloadIconClass(true)}
        onClick={handleDownloadOriginal}
      />
      <DownloadAction
        title={labels.downloadSigned}
        description={signedDescription}
        icon={FileBadge}
        iconClassName={signedIconClass}
        iconBackgroundClassName={signedIconBackground}
        loading={downloadingSigned}
        disabled={downloadingSigned || !isCompleted}
        downloadIconClassName={downloadIconClass(isCompleted)}
        onClick={handleDownloadSigned}
      />
      {onDownloadP7s ? (
        <DownloadAction
          title={labels.downloadP7s}
          description={p7sDescription}
          icon={FileSignature}
          iconClassName={p7sIconClass}
          iconBackgroundClassName={p7sIconBackground}
          loading={downloadingP7s}
          disabled={downloadingP7s || !isCompleted}
          downloadIconClassName={downloadIconClass(isCompleted)}
          onClick={handleDownloadP7s}
        />
      ) : null}
    </div>
  );
}

type DownloadActionProps = Readonly<{
  title: string;
  description: string;
  icon: LucideIcon;
  iconClassName: string;
  iconBackgroundClassName: string;
  loading: boolean;
  disabled: boolean;
  downloadIconClassName: string;
  onClick: () => void;
}>;

function DownloadAction({
  title,
  description,
  icon: Icon,
  iconClassName,
  iconBackgroundClassName,
  loading,
  disabled,
  downloadIconClassName,
  onClick,
}: DownloadActionProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="flex w-full items-center gap-3 rounded-xl border border-th-border bg-th-hover p-3.5 text-left transition-all hover:border-th-card-border hover:bg-th-active disabled:opacity-50"
    >
      <div
        className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${iconBackgroundClassName}`}
      >
        <Icon className={`h-5 w-5 ${iconClassName}`} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-foreground-muted">{description}</p>
      </div>
      {loading ? (
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-muted" />
      ) : (
        <Download className={`h-4 w-4 shrink-0 ${downloadIconClassName}`} />
      )}
    </button>
  );
}

export function DocumentAuditView({
  data,
  documents,
  onDownloadOriginal,
  onDownloadSigned,
  onDownloadP7s,
  labels,
}: DocumentAuditViewProps) {
  const { document: doc, signers, timeline } = data;
  const isCompleted = doc.status === 'completed';
  const hasMultipleDocuments = (documents?.length ?? 0) > 1;

  const statusBadgeVariant = doc.status === 'completed' ? ('success' as const) : ('info' as const);

  return (
    <div className="mx-auto w-full max-w-3xl space-y-5">
      <Card variant="glass" className="space-y-3 p-5 md:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-th-icon-bg">
              <FileText className="h-5 w-5 text-th-icon-fg" />
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-medium text-foreground md:text-xl">{doc.title}</h1>
              <p className="text-xs text-foreground-muted">{labels.title}</p>
            </div>
          </div>
          <Badge variant={statusBadgeVariant} className="w-fit shrink-0 text-xs">
            {labels.statusLabels[doc.status] ?? doc.status}
          </Badge>
        </div>
      </Card>

      <Card variant="glass" className="space-y-4 p-5 md:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
          {labels.documentDetails}
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-2.5">
            <Globe className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <div>
              <p className="text-xs text-foreground-muted">{labels.signingMode}</p>
              <p className="text-sm font-medium">
                {doc.signingMode === 'parallel'
                  ? labels.signingModeParallel
                  : labels.signingModeSequential}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <CalendarDays className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <div>
              <p className="text-xs text-foreground-muted">{labels.createdAt}</p>
              <p className="text-sm font-medium">{formatDate(doc.createdAt)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5">
            <Clock className="h-4 w-4 shrink-0 text-foreground-subtle" />
            <div>
              <p className="text-xs text-foreground-muted">{labels.expiresAt}</p>
              <p className="text-sm font-medium">
                {doc.expiresAt ? formatDate(doc.expiresAt) : labels.noExpiry}
              </p>
            </div>
          </div>
          {doc.completedAt ? (
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
              <div>
                <p className="text-xs text-foreground-muted">{labels.completedAt}</p>
                <p className="text-sm font-medium text-success">{formatDate(doc.completedAt)}</p>
              </div>
            </div>
          ) : null}
        </div>
      </Card>

      <Card variant="glass" className="space-y-4 p-5 md:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
          {labels.hashes}
        </h2>
        <div className="space-y-3">
          <CopyableHash label={labels.originalHash} hash={doc.originalHash} labels={labels} />
          <CopyableHash label={labels.signedHash} hash={doc.finalHash} labels={labels} />
        </div>
      </Card>

      {timeline.length > 0 ? (
        <Card variant="glass" className="space-y-4 p-5 md:p-6">
          <h2 className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
            {labels.timeline}
          </h2>
          <div className="relative space-y-0">
            {timeline.map((event, idx) => {
              const Icon = TIMELINE_ICONS[event.type] ?? Clock;
              const colorClass = TIMELINE_COLORS[event.type] ?? 'bg-th-hover text-foreground-subtle';
              const isLast = idx === timeline.length - 1;

              let eventText = '';
              if (event.type === 'sent') eventText = labels.eventsFormat.sent(event.actorName);
              else if (event.type === 'signed')
                eventText = labels.eventsFormat.signed(event.actorName);
              else if (event.type === 'completed') eventText = labels.eventsFormat.completed();
              else if (event.type === 'verified')
                eventText = labels.eventsFormat.verified(event.actorName);

              return (
                <div key={`${event.type}-${event.timestamp}-${idx}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${colorClass}`}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    {isLast ? null : <div className="h-full w-px bg-th-border" />}
                  </div>
                  <div className="pb-5">
                    <p className="text-sm font-medium">{eventText}</p>
                    <p className="text-xs text-foreground-subtle">{formatDate(event.timestamp)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      ) : null}

      <Card variant="glass" className="space-y-4 p-5 md:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
          {labels.signers}
        </h2>
        <div className="space-y-3">
          {signers.map((signer, idx) => {
            const isSigned = signer.status === 'signed';
            return (
              <div
                key={signer.id}
                className={`rounded-xl border bg-th-hover p-4 space-y-4 ${
                  isSigned
                    ? 'border-l-4 border-l-success border-y-th-border border-r-th-border'
                    : 'border-th-border'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium">
                      {idx + 1}. {signer.name}
                    </p>
                    <p className="truncate text-xs text-foreground-muted">{signer.email}</p>
                  </div>
                  <Badge
                    variant={isSigned ? 'success' : 'warning'}
                    className="shrink-0 text-[10px]"
                  >
                    {isSigned ? labels.signerCard.signed : labels.signerCard.pending}
                  </Badge>
                </div>

                <div className="border-t border-th-border" />

                <div className="flex gap-4">
                  <div className="grid flex-1 grid-cols-1 gap-2.5 text-xs sm:grid-cols-2">
                    {signer.signedAt ? (
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <CheckCircle2 className="h-3 w-3 shrink-0 text-success" />
                        <span>
                          {labels.signerCard.signedAt}: {formatDate(signer.signedAt)}
                        </span>
                      </div>
                    ) : null}
                    {signer.notifiedAt ? (
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Send className="h-3 w-3 shrink-0" />
                        <span>
                          {labels.signerCard.notifiedAt}: {formatDate(signer.notifiedAt)}
                        </span>
                      </div>
                    ) : null}
                    {signer.verifiedAt ? (
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <UserCheck className="h-3 w-3 shrink-0" />
                        <span>
                          {labels.signerCard.verifiedAt}: {formatDate(signer.verifiedAt)}
                        </span>
                      </div>
                    ) : null}
                    <div className="flex items-center gap-1.5 text-foreground-muted">
                      <Mail className="h-3 w-3 shrink-0" />
                      <span>
                        {labels.signerCard.authMethod}:{' '}
                        {signer.authMethod === 'email'
                          ? labels.signerCard.authMethodEmail
                          : labels.signerCard.authMethodNone}
                      </span>
                    </div>
                    {signer.ipAddress ? (
                      <div className="flex items-center gap-1.5 text-foreground-muted">
                        <Globe className="h-3 w-3 shrink-0" />
                        <span>
                          {labels.signerCard.ip}: {signer.ipAddress}
                        </span>
                      </div>
                    ) : null}
                    {signer.userAgent ? (
                      <div className="col-span-full flex items-start gap-1.5 text-foreground-muted">
                        <Monitor className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="break-all">
                          {labels.signerCard.userAgent}:{' '}
                          {signer.userAgent.length > 100
                            ? `${signer.userAgent.slice(0, 100)}...`
                            : signer.userAgent}
                        </span>
                      </div>
                    ) : null}
                  </div>

                  {signer.signatureData ? (
                    <div className="flex shrink-0 items-start">
                      <div className="flex h-20 w-28 items-center justify-center overflow-hidden rounded-lg border border-th-border bg-white p-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={signer.signatureData}
                          alt=""
                          className="h-full w-full object-contain"
                        />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>
      </Card>

      <Card variant="glass" className="space-y-4 p-5 md:p-6">
        <h2 className="text-sm font-medium uppercase tracking-wider text-foreground-muted">
          {labels.downloads}
        </h2>
        {hasMultipleDocuments && documents ? (
          <div className="space-y-5">
            {documents.map((docItem) => (
              <div key={docItem.id}>
                <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                  <FileText className="h-3.5 w-3.5" />
                  {docItem.title}
                </p>
                <SingleDocDownload
                  docTitle={docItem.title}
                  documentId={docItem.id}
                  isCompleted={isCompleted}
                  onDownloadOriginal={onDownloadOriginal}
                  onDownloadSigned={onDownloadSigned}
                  onDownloadP7s={onDownloadP7s}
                  labels={labels}
                />
              </div>
            ))}
          </div>
        ) : (
          <SingleDocDownload
            docTitle={doc.title}
            isCompleted={isCompleted}
            onDownloadOriginal={onDownloadOriginal}
            onDownloadSigned={onDownloadSigned}
            onDownloadP7s={onDownloadP7s}
            labels={labels}
          />
        )}
      </Card>

      <div className="flex items-center justify-center gap-2 pb-4 text-xs text-foreground-subtle">
        <ShieldCheck className="h-4 w-4 text-success/60" />
        <span>ICP-Brasil</span>
      </div>
    </div>
  );
}

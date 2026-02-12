"use client";

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  FileBadge,
  ShieldCheck,
  Loader2,
  FileSearch,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter, Link } from '@/i18n/navigation';
import { Button, Card } from '@/shared/ui';
import { FadeIn, ScaleIn, StaggerChildren, StaggerItem } from '@/shared/animations';
import { getSignerByToken, getSignerPdf, getSignerSignedPdf } from '@/features/signing/api';

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

type SignerInfo = Readonly<{
  name: string;
  documentTitle: string;
  documentStatus: string;
}>;

type SuccessActionsProps = Readonly<{
  token: string;
  signerInfo: SignerInfo | null;
  signedAvailable: boolean | null;
  downloadingOriginal: boolean;
  downloadingSigned: boolean;
  onDownloadOriginal: () => void;
  onDownloadSigned: () => void;
  labels: Readonly<{
    downloads: string;
    downloadOriginal: string;
    downloadOriginalDesc: string;
    downloadSigned: string;
    downloadSignedDesc: string;
    downloadSignedUnavailable: string;
    viewSummary: string;
  }>;
}>;

function SuccessActions({
  token,
  signedAvailable,
  downloadingOriginal,
  downloadingSigned,
  onDownloadOriginal,
  onDownloadSigned,
  labels,
}: SuccessActionsProps) {
  return (
    <>
      <div className="space-y-3">
        <p className="text-xs font-normal uppercase tracking-wider text-foreground-subtle">
          {labels.downloads}
        </p>
        <button
          type="button"
          onClick={onDownloadOriginal}
          disabled={downloadingOriginal}
          className="flex w-full items-center gap-3 rounded-xl border border-th-border bg-th-hover p-3.5 text-left transition-all hover:border-th-card-border hover:bg-th-active disabled:opacity-50"
        >
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/20">
            <FileText className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{labels.downloadOriginal}</p>
            <p className="text-xs text-foreground-subtle">{labels.downloadOriginalDesc}</p>
          </div>
          {downloadingOriginal ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-subtle" />
          ) : (
            <Download className="h-4 w-4 shrink-0 text-foreground-subtle" />
          )}
        </button>
        <button
          type="button"
          onClick={onDownloadSigned}
          disabled={downloadingSigned || signedAvailable === false}
          className="flex w-full items-center gap-3 rounded-xl border border-th-border bg-th-hover p-3.5 text-left transition-all hover:border-th-card-border hover:bg-th-active disabled:opacity-50"
        >
          <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
            signedAvailable ? 'bg-success/20' : 'bg-th-hover'
          }`}>
            <FileBadge className={`h-5 w-5 ${
              signedAvailable ? 'text-success' : 'text-foreground-subtle'
            }`} />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium">{labels.downloadSigned}</p>
            <p className="text-xs text-foreground-subtle">
              {signedAvailable === false
                ? labels.downloadSignedUnavailable
                : labels.downloadSignedDesc}
            </p>
          </div>
          {downloadingSigned ? (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-foreground-subtle" />
          ) : (
            <Download className={`h-4 w-4 shrink-0 ${
              signedAvailable ? 'text-foreground-subtle' : 'text-foreground-subtle/50'
            }`} />
          )}
        </button>
      </div>
      <Link
        href={`/sign/${token}/summary`}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-th-border bg-th-hover px-4 py-3 text-sm font-normal transition-all hover:border-th-card-border hover:bg-th-active"
      >
        <FileSearch className="h-4 w-4" />
        {labels.viewSummary}
      </Link>
    </>
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] dark:bg-gradient-main px-4 py-8 text-foreground">
        <Loader2 className="h-8 w-8 animate-spin text-foreground-subtle" />
      </div>
    }>
      <SuccessPageContent />
    </Suspense>
  );
}

function SuccessPageContent() {
  const t = useTranslations('success');
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [signerInfo, setSignerInfo] = useState<SignerInfo | null>(null);
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [downloadingSigned, setDownloadingSigned] = useState(false);
  const [signedAvailable, setSignedAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    if (!token) return;
    getSignerByToken(token).then((data) => {
      setSignerInfo({
        name: data.signer.name,
        documentTitle: data.document.title,
        documentStatus: data.document.status,
      });
      setSignedAvailable(data.document.status === 'completed');
    }).catch(() => {
      setSignerInfo(null);
    });
  }, [token]);

  const greeting = useMemo(() => {
    if (!signerInfo) return '';
    return t('greeting', { name: signerInfo.name });
  }, [signerInfo, t]);

  const handleDownloadOriginal = useCallback(async () => {
    if (!token) return;
    setDownloadingOriginal(true);
    try {
      const blob = await getSignerPdf(token);
      const filename = signerInfo
        ? `${signerInfo.documentTitle}-original.pdf`
        : 'document-original.pdf';
      downloadBlob(blob, filename);
    } finally {
      setDownloadingOriginal(false);
    }
  }, [token, signerInfo]);

  const handleDownloadSigned = useCallback(async () => {
    if (!token) return;
    setDownloadingSigned(true);
    try {
      const blob = await getSignerSignedPdf(token);
      if (blob) {
        const filename = signerInfo
          ? `${signerInfo.documentTitle}-signed.pdf`
          : 'document-signed.pdf';
        downloadBlob(blob, filename);
      }
    } finally {
      setDownloadingSigned(false);
    }
  }, [token, signerInfo]);

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] dark:bg-gradient-main px-4 py-8 text-foreground">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
        <FadeIn>
        <Card variant="glass" className="w-full space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <ScaleIn bounce>
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
                <CheckCircle2 className="h-9 w-9 text-success" />
              </div>
            </ScaleIn>

            <FadeIn delay={0.2}>
              {greeting ? (
                <p className="text-base font-medium text-success">{greeting}</p>
              ) : null}
            </FadeIn>

            <FadeIn delay={0.3}>
              <h1 className="text-xl font-medium md:text-2xl">{t('title')}</h1>
              <p className="text-sm leading-relaxed text-foreground-muted">{t('subtitle')}</p>
            </FadeIn>
          </div>

          {token ? (
            <StaggerChildren staggerDelay={0.1}>
              <StaggerItem>
                <SuccessActions
                  token={token}
                  signerInfo={signerInfo}
                  signedAvailable={signedAvailable}
                  downloadingOriginal={downloadingOriginal}
                  downloadingSigned={downloadingSigned}
                  onDownloadOriginal={handleDownloadOriginal}
                  onDownloadSigned={handleDownloadSigned}
                  labels={{
                    downloads: t('downloads'),
                    downloadOriginal: t('downloadOriginal'),
                    downloadOriginalDesc: t('downloadOriginalDesc'),
                    downloadSigned: t('downloadSigned'),
                    downloadSignedDesc: t('downloadSignedDesc'),
                    downloadSignedUnavailable: t('downloadSignedUnavailable'),
                    viewSummary: t('viewSummary'),
                  }}
                />
              </StaggerItem>
            </StaggerChildren>
          ) : null}

          <FadeIn delay={0.5}>
            <div className="flex justify-center pt-1">
              <Button type="button" variant="primary" onClick={() => router.push('/')}>
                {t('cta')}
              </Button>
            </div>
          </FadeIn>

          <FadeIn delay={0.6}>
            <div className="flex items-center justify-center gap-2 text-xs text-foreground-subtle">
              <ShieldCheck className="h-4 w-4 text-success/60" />
              <span>{t('securityNote')}</span>
              <span className="mx-1">·</span>
              <span>{t('badge')}</span>
            </div>
          </FadeIn>
        </Card>
        </FadeIn>
      </div>
    </div>
  );
}

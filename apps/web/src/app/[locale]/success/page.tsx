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
import { FadeIn } from '@/shared/animations';
import type { SignerWithEnvelope } from '@/features/signing/api';
import { getSignerByToken, getSignerPdfUrl, getSignerSignedPdfUrl } from '@/features/signing/api';

function openDownloadUrl(url: string): void {
  window.open(url, '_blank', 'noopener,noreferrer');
}

type DocumentInfo = SignerWithEnvelope['documents'][number];

type DocumentDownloadItemProps = Readonly<{
  token: string;
  doc: DocumentInfo;
  signedAvailable: boolean;
  labels: Readonly<{
    downloadOriginal: string;
    downloadOriginalDesc: string;
    downloadSigned: string;
    downloadSignedDesc: string;
    downloadSignedUnavailable: string;
  }>;
}>;

function DocumentDownloadItem({ token, doc, signedAvailable, labels }: DocumentDownloadItemProps) {
  const [downloadingOriginal, setDownloadingOriginal] = useState(false);
  const [downloadingSigned, setDownloadingSigned] = useState(false);

  const handleDownloadOriginal = useCallback(async () => {
    setDownloadingOriginal(true);
    try {
      const result = await getSignerPdfUrl(token, doc.id);
      openDownloadUrl(result.url);
    } finally {
      setDownloadingOriginal(false);
    }
  }, [token, doc.id]);

  const handleDownloadSigned = useCallback(async () => {
    setDownloadingSigned(true);
    try {
      const result = await getSignerSignedPdfUrl(token, doc.id);
      if (result) {
        openDownloadUrl(result.url);
      }
    } finally {
      setDownloadingSigned(false);
    }
  }, [token, doc.id]);

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={handleDownloadOriginal}
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
        onClick={handleDownloadSigned}
        disabled={downloadingSigned || !signedAvailable}
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
            {signedAvailable
              ? labels.downloadSignedDesc
              : labels.downloadSignedUnavailable}
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
  );
}

export default function SuccessPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] px-4 py-8 text-foreground">
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

  const [signerData, setSignerData] = useState<SignerWithEnvelope | null>(null);

  useEffect(() => {
    if (!token) return;
    getSignerByToken(token).then(setSignerData).catch(() => {
      setSignerData(null);
    });
  }, [token]);

  const greeting = useMemo(() => {
    if (!signerData) return '';
    return t('greeting', { name: signerData.signer.name });
  }, [signerData, t]);

  const signedAvailable = signerData?.envelope.status === 'completed';
  const documents = signerData?.documents ?? [];
  const hasMultipleDocuments = documents.length > 1;

  const downloadLabels = useMemo(
    () => ({
      downloadOriginal: t('downloadOriginal'),
      downloadOriginalDesc: t('downloadOriginalDesc'),
      downloadSigned: t('downloadSigned'),
      downloadSignedDesc: t('downloadSignedDesc'),
      downloadSignedUnavailable: t('downloadSignedUnavailable'),
    }),
    [t],
  );

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-[var(--th-page-bg)] px-4 py-8 text-foreground">
      <FadeIn className="w-full max-w-md">
        <Card variant="glass" className="w-full space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>

            {greeting ? (
              <p className="text-base font-medium text-success">{greeting}</p>
            ) : null}

            <div>
              <h1 className="text-xl font-medium md:text-2xl">{t('title')}</h1>
              <p className="text-sm leading-relaxed text-foreground-muted">{t('subtitle')}</p>
            </div>
          </div>

          {token && documents.length > 0 ? (
            <div className="space-y-3">
              <p className="text-xs font-normal uppercase tracking-wider text-foreground-subtle">
                {t('downloads')}
              </p>
              <div className="space-y-4">
                {documents.map((doc) => (
                  <div key={doc.id}>
                    {hasMultipleDocuments ? (
                      <p className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground-muted">
                        <FileText className="h-3.5 w-3.5" />
                        {doc.title}
                      </p>
                    ) : null}
                    <DocumentDownloadItem
                      token={token}
                      doc={doc}
                      signedAvailable={signedAvailable}
                      labels={downloadLabels}
                    />
                  </div>
                ))}
              </div>
              <Link
                href={`/sign/${token}/summary`}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-th-border bg-th-hover px-4 py-3 text-sm font-normal transition-all hover:border-th-card-border hover:bg-th-active"
              >
                <FileSearch className="h-4 w-4" />
                {t('viewSummary')}
              </Link>
            </div>
          ) : null}

          <div className="flex justify-center pt-1">
            <Button type="button" variant="primary" onClick={() => router.push('/')}>
              {t('cta')}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-foreground-subtle">
            <ShieldCheck className="h-4 w-4 text-success/60" />
            <span>{t('securityNote')}</span>
            <span className="mx-1">·</span>
            <span>{t('badge')}</span>
          </div>
        </Card>
      </FadeIn>
    </div>
  );
}

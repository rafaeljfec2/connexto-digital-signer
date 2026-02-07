"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import {
  CheckCircle2,
  Download,
  FileText,
  FileBadge,
  ShieldCheck,
  Loader2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useSearchParams } from 'next/navigation';
import { useRouter } from '@/i18n/navigation';
import { Button, Card } from '@/shared/ui';
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

export default function SuccessPage() {
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
    <div className="flex min-h-[100dvh] items-center justify-center bg-gradient-main px-4 py-8 text-white">
      <div className="mx-auto flex w-full max-w-md flex-col items-center gap-5">
        <Card variant="glass" className="w-full space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-success/20">
              <CheckCircle2 className="h-9 w-9 text-success" />
            </div>

            {greeting ? (
              <p className="text-base font-medium text-success">{greeting}</p>
            ) : null}

            <h1 className="text-xl font-bold md:text-2xl">{t('title')}</h1>
            <p className="text-sm leading-relaxed text-neutral-100/60">{t('subtitle')}</p>
          </div>

          {token ? (
            <div className="space-y-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-neutral-100/40">
                {t('downloads')}
              </p>

              <button
                type="button"
                onClick={handleDownloadOriginal}
                disabled={downloadingOriginal}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-accent-400/20">
                  <FileText className="h-5 w-5 text-accent-400" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t('downloadOriginal')}</p>
                  <p className="text-xs text-neutral-100/50">{t('downloadOriginalDesc')}</p>
                </div>
                {downloadingOriginal ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-100/50" />
                ) : (
                  <Download className="h-4 w-4 shrink-0 text-neutral-100/40" />
                )}
              </button>

              <button
                type="button"
                onClick={handleDownloadSigned}
                disabled={downloadingSigned || signedAvailable === false}
                className="flex w-full items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3.5 text-left transition-all hover:border-white/20 hover:bg-white/10 disabled:opacity-50"
              >
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${
                  signedAvailable ? 'bg-success/20' : 'bg-white/10'
                }`}>
                  <FileBadge className={`h-5 w-5 ${
                    signedAvailable ? 'text-success' : 'text-neutral-100/40'
                  }`} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold">{t('downloadSigned')}</p>
                  <p className="text-xs text-neutral-100/50">
                    {signedAvailable === false
                      ? t('downloadSignedUnavailable')
                      : t('downloadSignedDesc')}
                  </p>
                </div>
                {downloadingSigned ? (
                  <Loader2 className="h-4 w-4 shrink-0 animate-spin text-neutral-100/50" />
                ) : (
                  <Download className={`h-4 w-4 shrink-0 ${
                    signedAvailable ? 'text-neutral-100/40' : 'text-neutral-100/20'
                  }`} />
                )}
              </button>
            </div>
          ) : null}

          <div className="flex justify-center pt-1">
            <Button type="button" variant="primary" onClick={() => router.push('/')}>
              {t('cta')}
            </Button>
          </div>

          <div className="flex items-center justify-center gap-2 text-xs text-neutral-100/40">
            <ShieldCheck className="h-4 w-4 text-success/60" />
            <span>{t('securityNote')}</span>
            <span className="mx-1">·</span>
            <span>{t('badge')}</span>
          </div>
        </Card>
      </div>
    </div>
  );
}

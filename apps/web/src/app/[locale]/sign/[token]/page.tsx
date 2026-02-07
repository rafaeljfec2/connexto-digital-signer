"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { FileText, PenTool } from 'lucide-react';
import { Avatar, Badge, Button, Card, Dialog } from '@/shared/ui';
import { SignaturePad } from '@/features/pdf-signature/components/SignaturePad';

export default function SignerDocumentPage() {
  const tSigner = useTranslations('signer');
  const tCommon = useTranslations('common');
  const [isSigning, setIsSigning] = useState(false);
  const [signatureValue, setSignatureValue] = useState<string | null>(null);

  return (
    <div className="min-h-screen bg-gradient-main px-4 py-8 text-white">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between pb-6">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/10">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <div className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-100/70">
              {tCommon('appName')}
            </div>
            <div className="text-lg font-semibold">{tSigner('title')}</div>
          </div>
        </div>
        <Badge variant="info">{tSigner('status.pending')}</Badge>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card variant="glass" className="p-6">
          <div className="flex items-center justify-between pb-4">
            <div>
              <p className="text-sm font-semibold">{tSigner('documentLabel')}</p>
              <p className="text-xs text-neutral-100/70">{tSigner('documentHint')}</p>
            </div>
            <Button type="button" variant="ghost">
              {tSigner('preview')}
            </Button>
          </div>
          <div className="flex h-[560px] items-center justify-center rounded-2xl border border-white/20 bg-white/10">
            <div className="text-center text-neutral-100/70">
              <FileText className="mx-auto mb-3 h-8 w-8" />
              {tSigner('pdfLoaded')}
            </div>
          </div>
        </Card>

        <div className="space-y-6">
          <Card variant="glass" className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Avatar name={tSigner('signerLabel')} size="md" statusColor="#14B8A6" />
              <div>
                <p className="text-sm font-semibold">{tSigner('signerLabel')}</p>
                <p className="text-xs text-neutral-100/70">{tSigner('signerEmail')}</p>
              </div>
            </div>
            <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-neutral-100/80">
              {tSigner('legalNotice')}
            </div>
            <Button type="button" onClick={() => setIsSigning(true)}>
              <PenTool className="h-4 w-4" />
              {tSigner('signAction')}
            </Button>
          </Card>

          <Card variant="glass" className="space-y-4 p-6">
            <p className="text-sm font-semibold">{tSigner('signatureStatus')}</p>
            <div className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm">
              <span>{tSigner('signatureLabel')}</span>
              <Badge variant={signatureValue ? 'success' : 'warning'}>
                {signatureValue ? tSigner('status.signed') : tSigner('status.pending')}
              </Badge>
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={isSigning}
        onClose={() => setIsSigning(false)}
        title={tSigner('signAction')}
        footer={null}
      >
        <SignaturePad
          onConfirm={(value) => {
            setSignatureValue(value);
            setIsSigning(false);
          }}
          onCancel={() => setIsSigning(false)}
        />
      </Dialog>
    </div>
  );
}

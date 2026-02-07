"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, PenTool, Fingerprint, Check } from 'lucide-react';
import { useRouter } from '@/i18n/navigation';
import { Avatar, Badge, Button, Card, Dialog } from '@/shared/ui';
import { SignaturePad } from '@/features/pdf-signature/components/SignaturePad';
import {
  useSignerData,
  useSignerPdf,
  useSignerFields,
  useAcceptSignature,
} from '@/features/signing/hooks';
import { SignerPdfViewer } from './signer-pdf-viewer';

export default function SignerDocumentPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;
  const tSigner = useTranslations('signer');
  const tCommon = useTranslations('common');
  const router = useRouter();

  const currentLocale = useLocale();

  const signerQuery = useSignerData(token);
  const pdfQuery = useSignerPdf(token);
  const fieldsQuery = useSignerFields(token);
  const acceptMutation = useAcceptSignature(token);

  useEffect(() => {
    const signingLang = signerQuery.data?.document.signingLanguage;
    if (signingLang && signingLang !== currentLocale) {
      globalThis.location.href = `/${signingLang}/sign/${token}`;
    }
  }, [signerQuery.data?.document.signingLanguage, currentLocale, token]);

  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [activeFieldId, setActiveFieldId] = useState<string | null>(null);

  const signerData = signerQuery.data;
  const fields = fieldsQuery.data ?? [];
  const alreadySigned = signerData?.signer.status === 'signed';

  const activeField = useMemo(
    () => fields.find((f) => f.id === activeFieldId) ?? null,
    [fields, activeFieldId]
  );

  const fileUrl = useMemo(() => {
    if (!pdfQuery.data) return '';
    return URL.createObjectURL(pdfQuery.data);
  }, [pdfQuery.data]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const requiredFields = useMemo(
    () => fields.filter((f) => f.required),
    [fields]
  );

  const filledCount = useMemo(
    () =>
      requiredFields.filter(
        (f) => (fieldValues[f.id] ?? f.value ?? '').length > 0
      ).length,
    [requiredFields, fieldValues]
  );

  const allRequiredFilled = filledCount === requiredFields.length && requiredFields.length > 0;

  const handleFieldClick = useCallback(
    (fieldId: string) => {
      if (alreadySigned) return;
      setActiveFieldId(fieldId);
    },
    [alreadySigned]
  );

  const handleSignatureConfirm = useCallback(
    (value: string) => {
      if (!activeFieldId) return;
      setFieldValues((prev) => ({ ...prev, [activeFieldId]: value }));
      setActiveFieldId(null);
    },
    [activeFieldId]
  );

  const handleSubmit = async () => {
    if (!allRequiredFilled) return;
    const fieldPayload = fields
      .filter((f) => (fieldValues[f.id] ?? '').length > 0)
      .map((f) => ({
        fieldId: f.id,
        value: fieldValues[f.id],
      }));

    await acceptMutation.mutateAsync({
      consent: 'I agree to sign this document',
      fields: fieldPayload,
    });

    router.push('/success');
  };

  if (signerQuery.isLoading || pdfQuery.isLoading || fieldsQuery.isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-main text-white">
        <div className="text-center">
          <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-white/30 border-t-white" />
          <p className="text-sm text-neutral-100/70">{tSigner('loading')}</p>
        </div>
      </div>
    );
  }

  if (signerQuery.isError || !signerData) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-main text-white">
        <Card variant="glass" className="max-w-md p-8 text-center">
          <FileText className="mx-auto mb-4 h-10 w-10 text-neutral-100/50" />
          <p className="text-lg font-semibold">{tSigner('error')}</p>
        </Card>
      </div>
    );
  }

  const { signer, document: doc } = signerData;

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
            <div className="text-lg font-semibold">{doc.title}</div>
          </div>
        </div>
        <Badge variant={alreadySigned ? 'success' : 'info'}>
          {alreadySigned ? tSigner('status.signed') : tSigner('status.pending')}
        </Badge>
      </header>

      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[1.5fr_1fr]">
        <Card variant="glass" className="p-4">
          {fileUrl ? (
            <SignerPdfViewer
              fileUrl={fileUrl}
              fields={fields}
              fieldValues={fieldValues}
              onFieldClick={handleFieldClick}
              disabled={alreadySigned}
            />
          ) : null}
        </Card>

        <div className="space-y-6">
          <Card variant="glass" className="space-y-4 p-6">
            <div className="flex items-center gap-3">
              <Avatar name={signer.name} size="md" statusColor="#14B8A6" />
              <div>
                <p className="text-sm font-semibold">{signer.name}</p>
                <p className="text-xs text-neutral-100/70">{signer.email}</p>
              </div>
            </div>

            {alreadySigned ? (
              <div className="rounded-xl border border-green-400/30 bg-green-400/10 p-4 text-sm text-green-300">
                <Check className="mb-1 inline h-4 w-4" /> {tSigner('alreadySigned')}
              </div>
            ) : (
              <>
                <div className="rounded-xl border border-white/20 bg-white/10 p-4 text-sm text-neutral-100/80">
                  {tSigner('legalNotice')}
                </div>

                <div className="text-xs text-neutral-100/60">
                  {tSigner('fieldsProgress', {
                    filled: filledCount,
                    total: requiredFields.length,
                  })}
                </div>

                <div className="space-y-2">
                  {fields.map((field) => {
                    const value = fieldValues[field.id] ?? field.value ?? '';
                    const isFilled = value.length > 0;
                    return (
                      <button
                        key={field.id}
                        type="button"
                        onClick={() => handleFieldClick(field.id)}
                        className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition ${
                          isFilled
                            ? 'border-green-400/30 bg-green-400/10 text-green-300'
                            : 'border-white/20 bg-white/5 text-neutral-100/70 hover:bg-white/10'
                        }`}
                      >
                        {field.type === 'initials' ? (
                          <Fingerprint className="h-4 w-4 shrink-0" />
                        ) : (
                          <PenTool className="h-4 w-4 shrink-0" />
                        )}
                        <span className="flex-1">
                          {field.type === 'initials'
                            ? tSigner('clickToInitials')
                            : tSigner('clickToSign')}
                          {field.required ? ' *' : ''}
                        </span>
                        {isFilled ? (
                          <Check className="h-4 w-4 shrink-0 text-green-400" />
                        ) : null}
                      </button>
                    );
                  })}
                </div>

                <Button
                  type="button"
                  onClick={handleSubmit}
                  disabled={!allRequiredFilled || acceptMutation.isPending}
                  isLoading={acceptMutation.isPending}
                  className="w-full"
                >
                  <PenTool className="h-4 w-4" />
                  {acceptMutation.isPending
                    ? tSigner('signing')
                    : tSigner('signAction')}
                </Button>
              </>
            )}
          </Card>
        </div>
      </div>

      <Dialog
        open={activeFieldId !== null}
        onClose={() => setActiveFieldId(null)}
        title={
          activeField?.type === 'initials'
            ? tSigner('clickToInitials')
            : tSigner('fillFieldTitle')
        }
        footer={null}
      >
        <SignaturePad
          onConfirm={handleSignatureConfirm}
          onCancel={() => setActiveFieldId(null)}
        />
      </Dialog>
    </div>
  );
}

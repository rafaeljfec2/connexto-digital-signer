"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useEmailPreview,
  useSendDocument,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Mail,
  RotateCcw,
  Save,
  Send,
} from 'lucide-react';
import { Button, Card, Dialog } from '@/shared/ui';

export type ReviewStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
};

export function ReviewStep({ documentId, onBack, onRestart }: Readonly<ReviewStepProps>) {
  const tReview = useTranslations('review');
  const tWizard = useTranslations('wizard');
  const signersQuery = useSigners(documentId);
  const fieldsQuery = useSignatureFields(documentId);
  const previewMutation = useEmailPreview(documentId);
  const sendMutation = useSendDocument(documentId);
  const [previewOpen, setPreviewOpen] = useState(false);

  const checklist = useMemo(() => {
    const signersOk = (signersQuery.data ?? []).length > 0;
    const fieldsOk = (fieldsQuery.data ?? []).some((field) => field.required);
    return { signersOk, fieldsOk };
  }, [signersQuery.data, fieldsQuery.data]);

  const allReady = checklist.signersOk;

  const handlePreview = async () => {
    await previewMutation.mutateAsync({});
    setPreviewOpen(true);
  };

  const handleSend = async () => {
    await sendMutation.mutateAsync({});
  };

  return (
    <Card variant="glass" className="w-full p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-foreground">{tReview('title')}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{tReview('subtitle')}</p>
      </div>

      <div className="space-y-4">
        {[
          { label: tReview('checklist.signers'), ok: checklist.signersOk },
          { label: tReview('checklist.fields'), ok: checklist.fieldsOk },
        ].map((item) => (
          <div
            key={item.label}
            className={`flex items-center justify-between rounded-lg border p-4 ${
              item.ok
                ? 'border-success/30 bg-success/5'
                : 'border-warning/30 bg-warning/5'
            }`}
          >
            <div className="flex items-center gap-3">
              {item.ok ? (
                <CheckCircle2 className="h-5 w-5 text-success" />
              ) : (
                <AlertCircle className="h-5 w-5 text-warning" />
              )}
              <span className="text-sm font-normal text-foreground">{item.label}</span>
            </div>
            <span className={`text-xs font-normal uppercase tracking-wide ${item.ok ? 'text-success' : 'text-warning'}`}>
              {item.ok ? tReview('status.ok') : tReview('status.pending')}
            </span>
          </div>
        ))}
      </div>

      <hr className="my-6 border-th-border" />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Button type="button" variant="ghost" onClick={() => {}}>
          <Save className="mr-1.5 h-4 w-4" />
          {tReview('saveDraft')}
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={handlePreview}
          isLoading={previewMutation.isPending}
        >
          <Eye className="mr-1.5 h-4 w-4" />
          {tReview('preview')}
        </Button>
        <Button
          type="button"
          onClick={handleSend}
          isLoading={sendMutation.isPending}
          disabled={!allReady || sendMutation.isPending}
        >
          <Send className="mr-1.5 h-4 w-4" />
          {sendMutation.isPending ? tReview('sending') : tReview('send')}
        </Button>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tWizard('back')}
          </Button>
          <Button type="button" variant="ghost" onClick={onRestart}>
            <RotateCcw className="mr-1 h-4 w-4" />
            {tWizard('restart')}
          </Button>
        </div>
      </div>

      <Dialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        title={tReview('previewTitle')}
        footer={
          <Button type="button" onClick={() => setPreviewOpen(false)}>
            {tReview('close')}
          </Button>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-xs font-normal uppercase tracking-wide text-foreground-subtle">
              {tReview('previewSubject')}
            </p>
            <div className="mt-1.5 flex items-center gap-2 rounded-lg border border-th-border bg-th-hover px-3 py-2">
              <Mail className="h-4 w-4 shrink-0 text-accent-400" />
              <p className="text-sm text-foreground">{previewMutation.data?.subject}</p>
            </div>
          </div>
          <div>
            <p className="text-xs font-normal uppercase tracking-wide text-foreground-subtle">
              {tReview('previewBody')}
            </p>
            <pre className="mt-1.5 whitespace-pre-wrap rounded-lg border border-th-border bg-th-hover p-3 text-sm leading-relaxed text-foreground-muted">
              {previewMutation.data?.body}
            </pre>
          </div>
        </div>
      </Dialog>
    </Card>
  );
}

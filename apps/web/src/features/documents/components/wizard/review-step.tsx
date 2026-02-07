"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useEmailPreview,
  useSendDocument,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { AlertCircle, CheckCircle2 } from 'lucide-react';
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

  const handlePreview = async () => {
    await previewMutation.mutateAsync({});
    setPreviewOpen(true);
  };

  const handleSend = async () => {
    await sendMutation.mutateAsync({});
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{tReview('title')}</h2>
        <p className="text-sm text-neutral-100/70">{tReview('subtitle')}</p>
      </div>
      <Card variant="glass" className="space-y-3 p-4">
        <ChecklistItem label={tReview('checklist.signers')} ok={checklist.signersOk} />
        <ChecklistItem label={tReview('checklist.fields')} ok={checklist.fieldsOk} />
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="ghost">
          {tReview('saveDraft')}
        </Button>
        <Button type="button" variant="secondary" onClick={handlePreview}>
          {tReview('preview')}
        </Button>
        <Button type="button" onClick={handleSend} isLoading={sendMutation.isPending}>
          {sendMutation.isPending ? tReview('sending') : tReview('send')}
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tWizard('back')}
        </Button>
        <Button type="button" variant="ghost" onClick={onRestart} className="text-xs">
          {tWizard('restart')}
        </Button>
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
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase text-neutral-100/70">
            {tReview('previewSubject')}
          </p>
          <p className="text-sm text-white">{previewMutation.data?.subject}</p>
          <p className="text-xs font-semibold uppercase text-neutral-100/70">
            {tReview('previewBody')}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-white">
            {previewMutation.data?.body}
          </pre>
        </div>
      </Dialog>
    </div>
  );
}

type ChecklistItemProps = {
  readonly label: string;
  readonly ok: boolean;
};

function ChecklistItem({ label, ok }: Readonly<ChecklistItemProps>) {
  const tReview = useTranslations('review');
  return (
    <div className="flex items-center justify-between text-sm">
      <div className="flex items-center gap-2 text-white">
        {ok ? <CheckCircle2 className="h-4 w-4 text-success" /> : <AlertCircle className="h-4 w-4 text-warning" />}
        <span>{label}</span>
      </div>
      <span className={ok ? 'text-success' : 'text-warning'}>
        {ok ? tReview('status.ok') : tReview('status.pending')}
      </span>
    </div>
  );
}

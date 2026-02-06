"use client";

import { useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useEmailPreview,
  useSendDocument,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Dialog } from '@/shared/ui';

export type ReviewStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
};

export function ReviewStep({ documentId, onBack }: Readonly<ReviewStepProps>) {
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
        <h2 className="text-lg font-semibold text-text">{tReview('title')}</h2>
        <p className="text-sm text-muted">{tReview('subtitle')}</p>
      </div>
      <Card className="space-y-3 p-4">
        <ChecklistItem label={tReview('checklist.signers')} ok={checklist.signersOk} />
        <ChecklistItem label={tReview('checklist.fields')} ok={checklist.fieldsOk} />
      </Card>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="ghost" onClick={handlePreview}>
          {tReview('preview')}
        </Button>
        <Button type="button" onClick={handleSend} disabled={sendMutation.isPending}>
          {sendMutation.isPending ? tReview('sending') : tReview('send')}
        </Button>
      </div>
      <div className="flex justify-start">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tWizard('back')}
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
          <p className="text-xs font-semibold uppercase text-muted">
            {tReview('previewSubject')}
          </p>
          <p className="text-sm text-text">{previewMutation.data?.subject}</p>
          <p className="text-xs font-semibold uppercase text-muted">
            {tReview('previewBody')}
          </p>
          <pre className="whitespace-pre-wrap text-sm text-text">
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
      <span className="text-text">{label}</span>
      <span className={ok ? 'text-emerald-600' : 'text-amber-600'}>
        {ok ? tReview('status.ok') : tReview('status.pending')}
      </span>
    </div>
  );
}

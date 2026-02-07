"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PenTool, ArrowRight, CheckCircle } from 'lucide-react';
import { useSignatureFields } from '@/features/documents/hooks/use-document-wizard';
import { Button, Card } from '@/shared/ui';
import { SignatureEditorModal } from './signature-editor-modal';

export type FieldsStepProps = Readonly<{
  documentId: string;
  onBack: () => void;
  onRestart: () => void;
  onNext: () => void;
}>;

export function FieldsStep({ documentId, onBack, onRestart, onNext }: FieldsStepProps) {
  const tFields = useTranslations('fields');
  const tWizard = useTranslations('wizard');
  const fieldsQuery = useSignatureFields(documentId);
  const [editorOpen, setEditorOpen] = useState(false);

  const fieldCount = fieldsQuery.data?.length ?? 0;
  const hasFields = fieldCount > 0;

  const handleEditorSave = () => {
    setEditorOpen(false);
    fieldsQuery.refetch();
    onNext();
  };

  const handleEditorClose = () => {
    setEditorOpen(false);
    fieldsQuery.refetch();
  };

  if (editorOpen) {
    return (
      <SignatureEditorModal
        documentId={documentId}
        onClose={handleEditorClose}
        onSave={handleEditorSave}
      />
    );
  }

  return (
    <div className="space-y-4">
      <Card variant="glass" className="mx-auto max-w-lg space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-accent-400/30 bg-accent-600/10">
          <PenTool className="h-7 w-7 text-accent-400" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-semibold text-white">
            {tFields('decisionTitle')}
          </h2>
          <p className="text-sm text-neutral-100/60">
            {tFields('decisionDescription')}
          </p>
        </div>

        {hasFields ? (
          <div className="flex items-center justify-center gap-2 rounded-lg border border-green-500/20 bg-green-500/10 px-4 py-2 text-sm text-green-400">
            <CheckCircle className="h-4 w-4" />
            {tFields('fieldsCount', { count: fieldCount })}
          </div>
        ) : null}

        <div className="flex flex-col gap-3">
          <Button type="button" onClick={() => setEditorOpen(true)}>
            <PenTool className="mr-2 h-4 w-4" />
            {hasFields ? tFields('editPositioning') : tFields('openEditor')}
          </Button>
          <Button type="button" variant="ghost" onClick={onNext}>
            {tFields('skipPositioning')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {tWizard('back')}
          </Button>
          <Button type="button" variant="ghost" onClick={onRestart} className="text-xs">
            {tWizard('restart')}
          </Button>
        </div>
      </div>
    </div>
  );
}

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
      <Card variant="glass" className="space-y-6 p-8 text-center">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full border border-primary/30 bg-primary/10">
          <PenTool className="h-7 w-7 text-primary" />
        </div>

        <div className="space-y-2">
          <h2 className="text-xl font-medium text-foreground">
            {tFields('decisionTitle')}
          </h2>
          <p className="text-sm text-foreground-muted">
            {tFields('decisionDescription')}
          </p>
        </div>

        <div className="mx-auto flex max-w-sm flex-col gap-3">
          {hasFields ? (
            <div className="flex items-center justify-center gap-2 rounded-lg border border-primary/20 bg-primary/10 px-4 py-2 text-sm text-primary">
              <CheckCircle className="h-4 w-4" />
              {tFields('fieldsCount', { count: fieldCount })}
            </div>
          ) : null}
          <Button type="button" onClick={() => setEditorOpen(true)}>
            <PenTool className="mr-2 h-4 w-4" />
            {hasFields ? tFields('editPositioning') : tFields('openEditor')}
          </Button>
          <Button type="button" variant="ghost" onClick={onNext}>
            {tFields('skipPositioning')}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
        <div className="flex items-center justify-between pt-4">
          <div className="flex items-center gap-2">
            <Button type="button" variant="ghost" onClick={onBack}>
              {tWizard('back')}
            </Button>
            <Button type="button" variant="ghost" onClick={onRestart}>
              {tWizard('restart')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

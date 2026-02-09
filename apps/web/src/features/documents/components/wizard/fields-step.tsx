"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { PenTool, ArrowRight, CheckCircle, X, Sparkles, Loader2 } from 'lucide-react';
import {
  useSignatureFields,
  useSigners,
  useSuggestFields,
  useBatchUpdateFields,
} from '@/features/documents/hooks/use-document-wizard';
import type { SignatureFieldInput } from '@/features/documents/api';
import { Button, Card } from '@/shared/ui';
import { lazyLoad } from '@/shared/utils/lazy-load';

const SignatureEditorModal = lazyLoad(
  () => import('./signature-editor-modal'),
  'SignatureEditorModal',
);

export type FieldsStepProps = Readonly<{
  documentId: string;
  onBack: () => void;
  onRestart: () => void;
  onCancel: () => void;
  onNext: () => void;
}>;

export function FieldsStep({ documentId, onBack, onRestart, onCancel, onNext }: FieldsStepProps) {
  const tFields = useTranslations('fields');
  const tWizard = useTranslations('wizard');
  const fieldsQuery = useSignatureFields(documentId);
  const signersQuery = useSigners(documentId);
  const suggestMutation = useSuggestFields(documentId);
  const batchUpdate = useBatchUpdateFields(documentId);
  const [editorOpen, setEditorOpen] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);

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

  const handleSuggestWithAi = async () => {
    const signers = signersQuery.data ?? [];
    if (signers.length === 0) return;
    setAiMessage(null);

    try {
      const result = await suggestMutation.mutateAsync(signers.length);

      if (result.fields.length === 0) {
        setAiMessage(tFields('aiEmpty'));
        return;
      }

      const payload: SignatureFieldInput[] = result.fields
        .filter((f) => signers[f.signerIndex])
        .map((f) => ({
          signerId: signers[f.signerIndex].id,
          type: f.type,
          page: f.page,
          x: f.x,
          y: f.y,
          width: f.width,
          height: f.height,
          required: true,
        }));

      await batchUpdate.mutateAsync(payload);
      await fieldsQuery.refetch();
      setAiMessage(tFields('aiSuccess', { count: payload.length }));
    } catch {
      setAiMessage(tFields('aiError'));
    }
  };

  const isAiLoading = suggestMutation.isPending || batchUpdate.isPending;
  const hasSigners = (signersQuery.data ?? []).length > 0;

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

          {aiMessage ? (
            <p className="text-center text-xs text-foreground-muted">{aiMessage}</p>
          ) : null}

          <Button
            type="button"
            variant="secondary"
            className="gap-2 border-primary/30 bg-primary/5 hover:bg-primary/10"
            onClick={handleSuggestWithAi}
            disabled={isAiLoading || !hasSigners}
          >
            {isAiLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4 text-primary" />
            )}
            {isAiLoading ? tFields('aiSuggesting') : tFields('suggestWithAiAction')}
          </Button>

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
            <Button type="button" variant="ghost" className="text-error hover:text-error/80" onClick={onCancel}>
              <X className="mr-1 h-4 w-4" />
              {tWizard('cancel')}
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}

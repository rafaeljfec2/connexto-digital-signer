"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useAddSigner,
  useDocument,
  useSigners,
  useUpdateDocument,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Input, Select } from '@/shared/ui';

export type SignersStepProps = {
  readonly documentId: string;
  readonly onNext: () => void;
};

export function SignersStep({ documentId, onNext }: Readonly<SignersStepProps>) {
  const tSigners = useTranslations('signers');
  const tWizard = useTranslations('wizard');
  const documentQuery = useDocument(documentId);
  const signersQuery = useSigners(documentId);
  const addSignerMutation = useAddSigner(documentId);
  const updateDocument = useUpdateDocument(documentId);

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [order, setOrder] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const signingMode = documentQuery.data?.signingMode ?? 'parallel';

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    await addSignerMutation.mutateAsync({
      name: name.trim(),
      email: email.trim(),
      order: signingMode === 'sequential' && order ? Number(order) : undefined,
    });
    setName('');
    setEmail('');
    setOrder('');
    await signersQuery.refetch();
  };

  const handleModeChange = async (mode: 'parallel' | 'sequential') => {
    await updateDocument.mutateAsync({ signingMode: mode });
    await documentQuery.refetch();
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 rounded bg-border/60" />
        <div className="h-24 rounded-lg border border-border bg-surface" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text">{tSigners('title')}</h2>
        <p className="text-sm text-muted">{tSigners('subtitle')}</p>
      </div>
      <Card className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-text">{tSigners('mode')}</label>
          <Select
            value={signingMode}
            onChange={(event) =>
              handleModeChange(event.target.value as 'parallel' | 'sequential')
            }
          >
            <option value="parallel">{tSigners('modeParallel')}</option>
            <option value="sequential">{tSigners('modeSequential')}</option>
          </Select>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={tSigners('namePlaceholder')}
          />
          <Input
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder={tSigners('emailPlaceholder')}
          />
          {signingMode === 'sequential' ? (
            <Input
              value={order}
              onChange={(event) => setOrder(event.target.value)}
              placeholder={tSigners('orderPlaceholder')}
              type="number"
              min={1}
            />
          ) : null}
        </div>
        <Button type="button" onClick={handleAdd} disabled={addSignerMutation.isPending}>
          {tSigners('add')}
        </Button>
      </Card>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-text">{tSigners('listTitle')}</h3>
        <div className="space-y-2">
          {(signersQuery.data ?? []).map((signer) => (
            <div
              key={signer.id}
              className="flex items-center justify-between rounded-lg border border-border bg-surface px-4 py-3 text-sm"
            >
              <div>
                <p className="font-medium text-text">{signer.name}</p>
                <p className="text-muted">{signer.email}</p>
              </div>
              {signingMode === 'sequential' && signer.order ? (
                <span className="text-xs text-muted">
                  {tSigners('orderLabel')} {signer.order}
                </span>
              ) : null}
            </div>
          ))}
          {signersQuery.data && signersQuery.data.length === 0 ? (
            <div className="rounded-lg border border-dashed border-border p-4 text-sm text-muted">
              {tSigners('empty')}
            </div>
          ) : null}
        </div>
      </div>
      <div className="flex justify-end">
        <Button type="button" onClick={onNext}>
          {tWizard('next')}
        </Button>
      </div>
    </div>
  );
}

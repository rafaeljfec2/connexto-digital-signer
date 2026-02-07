"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  useAddSigner,
  useDocument,
  useSigners,
  useUpdateDocument,
} from '@/features/documents/hooks/use-document-wizard';
import { Avatar, Badge, Button, Card, Input, Select } from '@/shared/ui';

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
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-24 rounded-lg border border-white/10 bg-white/10" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{tSigners('title')}</h2>
        <p className="text-sm text-neutral-100/70">{tSigners('subtitle')}</p>
      </div>
      <Card variant="glass" className="space-y-4 p-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-neutral-100">{tSigners('mode')}</label>
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
        <Button type="button" onClick={handleAdd} isLoading={addSignerMutation.isPending}>
          {tSigners('add')}
        </Button>
      </Card>
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-white">{tSigners('listTitle')}</h3>
        <div className="space-y-2">
          {(signersQuery.data ?? []).map((signer) => (
            <div
              key={signer.id}
              className="flex items-center justify-between rounded-xl border border-white/20 bg-white/10 px-4 py-3 text-sm text-white"
            >
              <div className="flex items-center gap-3">
                <Avatar name={signer.name} size="sm" statusColor="#14B8A6" />
                <div>
                  <p className="font-medium">{signer.name}</p>
                  <p className="text-neutral-100/70">{signer.email}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {signingMode === 'sequential' && signer.order ? (
                  <Badge variant="info">
                    {tSigners('orderLabel')} {signer.order}
                  </Badge>
                ) : null}
              </div>
            </div>
          ))}
          {signersQuery.data?.length === 0 ? (
            <div className="rounded-lg border border-dashed border-white/20 p-4 text-sm text-neutral-100/70">
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

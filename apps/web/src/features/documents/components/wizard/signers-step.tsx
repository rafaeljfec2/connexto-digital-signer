"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus } from 'lucide-react';
import type { Signer } from '@/features/documents/api';
import {
  useAddSigner,
  useDocument,
  useRemoveSigner,
  useSigners,
  useUpdateDocument,
  useUpdateSigner,
} from '@/features/documents/hooks/use-document-wizard';
import { Avatar, Badge, Button, Card, Dialog, Input, Select } from '@/shared/ui';

function formatCpf(value: string): string {
  const digits = value.replaceAll(/\D/g, '').slice(0, 11);
  if (digits.length <= 3) return digits;
  if (digits.length <= 6) return `${digits.slice(0, 3)}.${digits.slice(3)}`;
  if (digits.length <= 9) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6)}`;
  return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
}

export type SignersStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onNext: () => void;
};

export function SignersStep({ documentId, onBack, onRestart, onNext }: Readonly<SignersStepProps>) {
  const tSigners = useTranslations('signers');
  const tWizard = useTranslations('wizard');
  const documentQuery = useDocument(documentId);
  const signersQuery = useSigners(documentId);
  const addSignerMutation = useAddSigner(documentId);
  const updateSignerMutation = useUpdateSigner(documentId);
  const removeSignerMutation = useRemoveSigner(documentId);
  const updateDocument = useUpdateDocument(documentId);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSigner, setEditingSigner] = useState<Signer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [requestCpf, setRequestCpf] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  const [order, setOrder] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const signingMode = documentQuery.data?.signingMode ?? 'parallel';
  const isEditing = editingSigner !== null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setCpf('');
    setBirthDate('');
    setRequestCpf(false);
    setAuthMethod('email');
    setOrder('');
    setEditingSigner(null);
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (signer: Signer) => {
    setEditingSigner(signer);
    setName(signer.name);
    setEmail(signer.email);
    setCpf(formatCpf(signer.cpf ?? ''));
    setBirthDate(signer.birthDate ?? '');
    setRequestCpf(signer.requestCpf);
    setAuthMethod(signer.authMethod);
    setOrder(signer.order ? String(signer.order) : '');
    setModalOpen(true);
  };

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      cpf: cpf.trim() || undefined,
      birthDate: birthDate.trim() || undefined,
      requestCpf,
      authMethod,
      order: signingMode === 'sequential' && order ? Number(order) : undefined,
    };

    if (isEditing) {
      await updateSignerMutation.mutateAsync({
        signerId: editingSigner.id,
        input: payload,
      });
    } else {
      await addSignerMutation.mutateAsync(payload);
    }

    resetForm();
    setModalOpen(false);
    await signersQuery.refetch();
  };

  const handleRemove = async (signerId: string) => {
    await removeSignerMutation.mutateAsync(signerId);
    await signersQuery.refetch();
  };

  const handleModeChange = async (mode: 'parallel' | 'sequential') => {
    await updateDocument.mutateAsync({ signingMode: mode });
    await documentQuery.refetch();
  };

  const handleCloseModal = () => {
    resetForm();
    setModalOpen(false);
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 rounded bg-th-hover" />
        <div className="h-24 rounded-lg border border-th-border bg-th-hover" />
      </div>
    );
  }

  const signers = signersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card variant="glass" className="space-y-6 p-8">
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-foreground">{tSigners('title')}</h2>
          <p className="text-sm text-foreground-muted">{tSigners('subtitle')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-medium text-foreground">{tSigners('listTitle')}</h3>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 text-sm"
              onClick={openAddModal}
            >
              <Plus className="h-4 w-4" />
              {tSigners('add')}
            </Button>
          </div>

          <div className="space-y-2">
            {signers.map((signer) => (
              <div
                key={signer.id}
                className="flex items-center justify-between rounded-xl border border-th-border bg-th-hover px-4 py-3 text-sm text-foreground"
              >
                <div className="flex items-center gap-3">
                  <Avatar name={signer.name} size="sm" statusColor="#14B8A6" />
                  <div>
                    <p className="font-normal">{signer.name}</p>
                    <p className="text-foreground-muted">{signer.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {signingMode === 'sequential' && signer.order ? (
                    <Badge variant="info">
                      {tSigners('orderLabel')} {signer.order}
                    </Badge>
                  ) : null}
                  <Button
                    type="button"
                    variant="ghost"
                    className="gap-1 text-xs"
                    onClick={() => openEditModal(signer)}
                  >
                    <Pencil className="h-3 w-3" />
                    {tSigners('edit')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-xs text-error hover:text-error/80"
                    onClick={() => handleRemove(signer.id)}
                  >
                    {tSigners('remove')}
                  </Button>
                </div>
              </div>
            ))}
            {signers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-th-border p-6 text-center text-sm text-foreground-muted">
                {tSigners('empty')}
              </div>
            ) : null}
          </div>
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
          <Button type="button" onClick={onNext}>
            {tWizard('next')}
          </Button>
        </div>
      </Card>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        title={isEditing ? tSigners('editTitle') : tSigners('add')}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={handleCloseModal}>
              {tSigners('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              isLoading={isEditing ? updateSignerMutation.isPending : addSignerMutation.isPending}
              disabled={!name.trim() || !email.trim()}
            >
              {isEditing ? tSigners('save') : tSigners('confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('mode')}
            </label>
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
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('nameLabel')}
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tSigners('namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('emailLabel')}
            </label>
            <Input
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder={tSigners('emailPlaceholder')}
              type="email"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('cpfLabel')}
            </label>
            <Input
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              placeholder={tSigners('cpfPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('birthDateLabel')}
            </label>
            <Input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              placeholder={tSigners('birthDatePlaceholder')}
              type="date"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input
              type="checkbox"
              checked={requestCpf}
              onChange={(event) => setRequestCpf(event.target.checked)}
              className="h-4 w-4 rounded border-th-input-border bg-th-input text-primary focus:ring-primary"
            />
            {tSigners('requestCpfLabel')}
          </label>
          <div className="space-y-2">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('authMethodLabel')}
            </label>
            <Select
              value={authMethod}
              onChange={(event) => setAuthMethod(event.target.value)}
            >
              <option value="email">{tSigners('authMethodEmail')}</option>
              <option value="none">{tSigners('authMethodNone')}</option>
            </Select>
          </div>
          {signingMode === 'sequential' ? (
            <div className="space-y-2">
              <label className="text-sm font-normal text-foreground-muted">
                {tSigners('orderLabel')}
              </label>
              <Input
                value={order}
                onChange={(event) => setOrder(event.target.value)}
                placeholder={tSigners('orderPlaceholder')}
                type="number"
                min={1}
              />
            </div>
          ) : null}
        </div>
      </Dialog>
    </div>
  );
}

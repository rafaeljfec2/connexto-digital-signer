"use client";

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus } from 'lucide-react';
import {
  useAddSigner,
  useRemoveSigner,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Avatar, Button, Card, Dialog, Input, Select } from '@/shared/ui';

export type SignersStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onNext: () => void;
};

export function SignersStep({ documentId, onBack, onRestart, onNext }: Readonly<SignersStepProps>) {
  const tSigners = useTranslations('signers');
  const tWizard = useTranslations('wizard');
  const signersQuery = useSigners(documentId);
  const addSignerMutation = useAddSigner(documentId);
  const removeSignerMutation = useRemoveSigner(documentId);

  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [requestCpf, setRequestCpf] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const resetForm = () => {
    setName('');
    setEmail('');
    setCpf('');
    setBirthDate('');
    setRequestCpf(false);
    setAuthMethod('email');
  };

  const handleAdd = async () => {
    if (!name.trim() || !email.trim()) return;
    await addSignerMutation.mutateAsync({
      name: name.trim(),
      email: email.trim(),
      cpf: cpf.trim() || undefined,
      birthDate: birthDate.trim() || undefined,
      requestCpf,
      authMethod,
    });
    resetForm();
    setModalOpen(false);
    await signersQuery.refetch();
  };

  const handleRemove = async (signerId: string) => {
    await removeSignerMutation.mutateAsync(signerId);
    await signersQuery.refetch();
  };

  const handleCloseModal = () => {
    resetForm();
    setModalOpen(false);
  };

  if (!isMounted) {
    return (
      <div className="space-y-4">
        <div className="h-4 w-40 rounded bg-white/10" />
        <div className="h-24 rounded-lg border border-white/10 bg-white/10" />
      </div>
    );
  }

  const signers = signersQuery.data ?? [];

  return (
    <div className="space-y-4">
      <Card variant="glass" className="space-y-6 p-8">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold text-white">{tSigners('title')}</h2>
          <p className="text-sm text-neutral-100/70">{tSigners('subtitle')}</p>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">{tSigners('listTitle')}</h3>
            <Button
              type="button"
              variant="secondary"
              className="gap-2 text-sm"
              onClick={() => setModalOpen(true)}
            >
              <Plus className="h-4 w-4" />
              {tSigners('add')}
            </Button>
          </div>

          <div className="space-y-2">
            {signers.map((signer) => (
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
              <div className="rounded-lg border border-dashed border-white/20 p-6 text-center text-sm text-neutral-100/70">
                {tSigners('empty')}
              </div>
            ) : null}
          </div>
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
        <Button type="button" onClick={onNext}>
          {tWizard('next')}
        </Button>
      </div>

      <Dialog
        open={modalOpen}
        onClose={handleCloseModal}
        title={tSigners('add')}
        footer={
          <>
            <Button type="button" variant="ghost" onClick={handleCloseModal}>
              {tSigners('cancel')}
            </Button>
            <Button
              type="button"
              onClick={handleAdd}
              isLoading={addSignerMutation.isPending}
              disabled={!name.trim() || !email.trim()}
            >
              {tSigners('confirm')}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-100">
              {tSigners('nameLabel')}
            </label>
            <Input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder={tSigners('namePlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-100">
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
            <label className="text-sm font-medium text-neutral-100">
              {tSigners('cpfLabel')}
            </label>
            <Input
              value={cpf}
              onChange={(event) => setCpf(event.target.value)}
              placeholder={tSigners('cpfPlaceholder')}
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-100">
              {tSigners('birthDateLabel')}
            </label>
            <Input
              value={birthDate}
              onChange={(event) => setBirthDate(event.target.value)}
              placeholder={tSigners('birthDatePlaceholder')}
              type="date"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-neutral-100">
            <input
              type="checkbox"
              checked={requestCpf}
              onChange={(event) => setRequestCpf(event.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/10 text-accent-400 focus:ring-accent-400"
            />
            {tSigners('requestCpfLabel')}
          </label>
          <div className="space-y-2">
            <label className="text-sm font-medium text-neutral-100">
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
        </div>
      </Dialog>
    </div>
  );
}

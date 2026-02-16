"use client";

import { useEffect, useState, useRef } from 'react';
import { useTranslations } from 'next-intl';
import { Pencil, Plus, X, Search } from 'lucide-react';
import type { Signer, SignerRole, TenantSigner } from '@/features/documents/api';
import {
  useAddSigner,
  useEnvelope,
  useRemoveSigner,
  useSigners,
  useUpdateEnvelope,
  useUpdateSigner,
} from '@/features/documents/hooks/use-document-wizard';
import { useSearchTenantSigners } from '@/features/documents/hooks/use-search-tenant-signers';
import { Avatar, Badge, Button, Card, Dialog, Input, Select } from '@/shared/ui';
import { formatCpf, isValidCpf } from '@/shared/utils/cpf';

export type SignersStepProps = {
  readonly envelopeId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onCancel: () => void;
  readonly onNext: () => void;
};

export function SignersStep({ envelopeId, onBack, onRestart, onCancel, onNext }: Readonly<SignersStepProps>) {
  const tSigners = useTranslations('signers');
  const tWizard = useTranslations('wizard');
  const envelopeQuery = useEnvelope(envelopeId);
  const signersQuery = useSigners(envelopeId);
  const addSignerMutation = useAddSigner(envelopeId);
  const updateSignerMutation = useUpdateSigner(envelopeId);
  const removeSignerMutation = useRemoveSigner(envelopeId);
  const updateEnvelopeMutation = useUpdateEnvelope(envelopeId);

  const { results: searchResults, isLoading: isSearching, search: searchContacts, clear: clearSearch } = useSearchTenantSigners();
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSigner, setEditingSigner] = useState<Signer | null>(null);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [cpf, setCpf] = useState('');
  const [birthDate, setBirthDate] = useState('');
  const [requestEmail, setRequestEmail] = useState(false);
  const [requestCpf, setRequestCpf] = useState(false);
  const [requestPhone, setRequestPhone] = useState(false);
  const [authMethod, setAuthMethod] = useState('email');
  const [role, setRole] = useState<SignerRole>('signer');
  const [order, setOrder] = useState('');
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearchInput = (value: string) => {
    setName(value);
    if (!isEditing) {
      searchContacts(value);
      setShowDropdown(value.trim().length >= 2);
    }
  };

  const handleEmailInput = (value: string) => {
    setEmail(value);
    if (!isEditing) {
      searchContacts(value);
      setShowDropdown(value.trim().length >= 2);
    }
  };

  const selectContact = (contact: TenantSigner) => {
    setName(contact.name);
    setEmail(contact.email);
    setPhone(contact.phone ?? '');
    setCpf(contact.cpf ? formatCpf(contact.cpf) : '');
    setBirthDate(contact.birthDate ?? '');
    setShowDropdown(false);
    clearSearch();
  };

  const signingMode = envelopeQuery.data?.signingMode ?? 'parallel';
  const isEditing = editingSigner !== null;

  const resetForm = () => {
    setName('');
    setEmail('');
    setPhone('');
    setCpf('');
    setBirthDate('');
    setRequestEmail(false);
    setRequestCpf(false);
    setRequestPhone(false);
    setAuthMethod('email');
    setRole('signer');
    setOrder('');
    setEditingSigner(null);
    setShowDropdown(false);
    clearSearch();
  };

  const openAddModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (signer: Signer) => {
    setEditingSigner(signer);
    setName(signer.name);
    setEmail(signer.email);
    setPhone(signer.phone ?? '');
    setCpf(formatCpf(signer.cpf ?? ''));
    setBirthDate(signer.birthDate ?? '');
    setRequestEmail(signer.requestEmail);
    setRequestCpf(signer.requestCpf);
    setRequestPhone(signer.requestPhone);
    setAuthMethod(signer.authMethod);
    setRole(signer.role ?? 'signer');
    setOrder(signer.order ? String(signer.order) : '');
    setModalOpen(true);
  };

  const cpfDigits = cpf.replaceAll(/\D/g, '');
  const isCpfTouched = cpfDigits.length > 0;
  const isCpfComplete = cpfDigits.length === 11;
  const cpfValid = !isCpfTouched || (isCpfComplete && isValidCpf(cpf));

  const handleSubmit = async () => {
    if (!name.trim() || !email.trim()) return;
    if (isCpfTouched && !isValidCpf(cpf)) return;

    const payload = {
      name: name.trim(),
      email: email.trim(),
      phone: phone.trim() || undefined,
      cpf: cpf.trim() || undefined,
      birthDate: birthDate.trim() || undefined,
      requestEmail,
      requestCpf,
      requestPhone,
      authMethod,
      role,
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
    await updateEnvelopeMutation.mutateAsync({ signingMode: mode });
    await envelopeQuery.refetch();
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
            <Button type="button" variant="ghost" className="text-error hover:text-error/80" onClick={onCancel}>
              <X className="mr-1 h-4 w-4" />
              {tWizard('cancel')}
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
              disabled={!name.trim() || !email.trim() || !cpfValid}
            >
              {isEditing ? tSigners('save') : tSigners('confirm')}
            </Button>
          </>
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          <div className="relative space-y-1.5" ref={dropdownRef}>
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('nameLabel')}
            </label>
            <div className="relative">
              <Input
                value={name}
                onChange={(event) => handleSearchInput(event.target.value)}
                placeholder={tSigners('namePlaceholder')}
                autoComplete="off"
              />
              {isSearching && (
                <Search className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-pulse text-foreground-muted" />
              )}
            </div>
            {showDropdown && searchResults.length > 0 && !isEditing && (
              <div className="absolute z-50 mt-1 max-h-48 w-full overflow-y-auto rounded-lg border border-th-border bg-th-card shadow-lg">
                {searchResults.map((contact) => (
                  <button
                    key={contact.id}
                    type="button"
                    className="flex w-full items-center gap-3 px-3 py-2 text-left text-sm hover:bg-th-hover"
                    onClick={() => selectContact(contact)}
                  >
                    <Avatar name={contact.name} size="sm" />
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-foreground">{contact.name}</p>
                      <p className="truncate text-xs text-foreground-muted">{contact.email}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('emailLabel')}
            </label>
            <Input
              value={email}
              onChange={(event) => handleEmailInput(event.target.value)}
              placeholder={tSigners('emailPlaceholder')}
              type="email"
              autoComplete="off"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('phoneLabel')}
            </label>
            <Input
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              placeholder={tSigners('phonePlaceholder')}
              type="tel"
            />
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('cpfLabel')}
            </label>
            <Input
              value={cpf}
              onChange={(event) => setCpf(formatCpf(event.target.value))}
              placeholder={tSigners('cpfPlaceholder')}
              className={isCpfTouched && isCpfComplete && !cpfValid ? 'border-error' : ''}
            />
            {isCpfTouched && isCpfComplete && !cpfValid && (
              <p className="text-xs text-error">{tSigners('cpfInvalid')}</p>
            )}
          </div>
          <div className="space-y-1.5">
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
          <div className="space-y-1.5">
            <label className="text-sm font-normal text-foreground-muted">
              {tSigners('roleLabel')}
            </label>
            <Select
              value={role}
              onChange={(event) => setRole(event.target.value as SignerRole)}
            >
              <option value="signer">{tSigners('roleSigner')}</option>
              <option value="witness">{tSigners('roleWitness')}</option>
              <option value="approver">{tSigners('roleApprover')}</option>
              <option value="party">{tSigners('roleParty')}</option>
              <option value="intervening">{tSigners('roleIntervening')}</option>
              <option value="guarantor">{tSigners('roleGuarantor')}</option>
              <option value="endorser">{tSigners('roleEndorser')}</option>
              <option value="legal_representative">{tSigners('roleLegalRepresentative')}</option>
              <option value="attorney">{tSigners('roleAttorney')}</option>
            </Select>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-2 md:col-span-2">
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={requestEmail}
                onChange={(event) => setRequestEmail(event.target.checked)}
                className="h-4 w-4 rounded border-th-input-border bg-th-input text-primary focus:ring-primary"
              />
              {tSigners('requestEmailLabel')}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={requestCpf}
                onChange={(event) => setRequestCpf(event.target.checked)}
                className="h-4 w-4 rounded border-th-input-border bg-th-input text-primary focus:ring-primary"
              />
              {tSigners('requestCpfLabel')}
            </label>
            <label className="flex items-center gap-2.5 text-sm text-foreground">
              <input
                type="checkbox"
                checked={requestPhone}
                onChange={(event) => setRequestPhone(event.target.checked)}
                className="h-4 w-4 rounded border-th-input-border bg-th-input text-primary focus:ring-primary"
              />
              {tSigners('requestPhoneLabel')}
            </label>
          </div>
          <div className="space-y-1.5">
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
          {signingMode === 'sequential' ? (
            <div className="space-y-1.5">
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

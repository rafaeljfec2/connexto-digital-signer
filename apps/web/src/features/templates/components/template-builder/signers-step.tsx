'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { TemplateSigner, AddTemplateSignerInput } from '../../api';
import type { SignerRole } from '@/features/documents/api';

const SIGNER_ROLES: ReadonlyArray<{ value: SignerRole; label: string }> = [
  { value: 'signer', label: 'Signer' },
  { value: 'witness', label: 'Witness' },
  { value: 'approver', label: 'Approver' },
  { value: 'party', label: 'Party' },
  { value: 'legal_representative', label: 'Legal Representative' },
];

type SignersStepProps = {
  readonly signers: ReadonlyArray<TemplateSigner>;
  readonly onAdd: (input: AddTemplateSignerInput) => void;
  readonly onRemove: (signerId: string) => void;
  readonly isAdding: boolean;
};

export function SignersStep({ signers, onAdd, onRemove, isAdding }: SignersStepProps) {
  const t = useTranslations('templates');
  const [label, setLabel] = useState('');
  const [role, setRole] = useState<SignerRole>('signer');

  const handleAdd = () => {
    if (!label.trim()) return;
    onAdd({ label: label.trim(), role });
    setLabel('');
    setRole('signer');
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border border-th-border bg-th-input p-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <label className="mb-1 block text-xs font-medium text-foreground">
            {t('builder.signerSlot.label')}
          </label>
          <input
            type="text"
            value={label}
            onChange={(e) => setLabel(e.target.value)}
            placeholder={t('builder.signerSlot.labelPlaceholder')}
            className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
          />
        </div>
        <div className="w-full sm:w-40">
          <label className="mb-1 block text-xs font-medium text-foreground">
            {t('builder.signerSlot.role')}
          </label>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as SignerRole)}
            className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
          >
            {SIGNER_ROLES.map((r) => (
              <option key={r.value} value={r.value}>{r.label}</option>
            ))}
          </select>
        </div>
        <Button
          type="button"
          variant="primary"
          className="h-9 gap-1.5"
          disabled={!label.trim() || isAdding}
          onClick={handleAdd}
        >
          <Plus className="h-4 w-4" />
          {t('builder.signerSlot.addSigner')}
        </Button>
      </div>

      {signers.length > 0 ? (
        <div className="space-y-2">
          {signers.map((s) => (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-xl border border-th-border bg-th-card p-3"
            >
              <Users className="h-5 w-5 shrink-0 text-primary" />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-foreground">{s.label}</p>
                <p className="text-xs text-foreground-muted capitalize">{s.role}</p>
              </div>
              <Button
                type="button"
                variant="ghost"
                className="h-8 w-8 p-0 text-error"
                onClick={() => onRemove(s.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-center text-sm text-foreground-muted py-8">
          {t('detail.noSigners')}
        </p>
      )}
    </div>
  );
}

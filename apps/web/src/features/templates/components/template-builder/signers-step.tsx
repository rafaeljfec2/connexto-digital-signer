'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Users } from 'lucide-react';
import { Button, LabelWithTooltip } from '@/shared/ui';
import { StaggerChildren, StaggerItem } from '@/shared/animations';
import type { TemplateSigner, AddTemplateSignerInput } from '../../api';
import type { SignerRole } from '@/features/documents/api';

const SIGNER_ROLES: ReadonlyArray<{ readonly value: SignerRole; readonly label: string }> = [
  { value: 'signer', label: 'Signatário' },
  { value: 'witness', label: 'Testemunha' },
  { value: 'approver', label: 'Aprovador' },
  { value: 'party', label: 'Parte' },
  { value: 'legal_representative', label: 'Representante Legal' },
];

const ROLE_COLORS: Record<string, string> = {
  signer: 'bg-primary/10 text-primary border-primary/20',
  witness: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  approver: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  party: 'bg-violet-500/10 text-violet-600 border-violet-500/20',
  legal_representative: 'bg-rose-500/10 text-rose-600 border-rose-500/20',
};

function getRoleLabel(role: string): string {
  return SIGNER_ROLES.find((r) => r.value === role)?.label ?? role;
}

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

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && label.trim()) {
      e.preventDefault();
      handleAdd();
    }
  };

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-primary/20 bg-primary/5 p-4">
        <p className="mb-3 text-xs font-medium uppercase tracking-wider text-primary">
          {t('builder.signerSlot.addSigner')}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1">
            <LabelWithTooltip
              label={t('builder.signerSlot.label')}
              tooltip={t('tooltips.signerSlotLabel')}
              size="xs"
              className="mb-1"
            />
            <input
              type="text"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t('builder.signerSlot.labelPlaceholder')}
              className="h-10 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
            />
          </div>
          <div className="w-full sm:w-44">
            <LabelWithTooltip
              label={t('builder.signerSlot.role')}
              tooltip={t('tooltips.signerRole')}
              size="xs"
              className="mb-1"
            />
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as SignerRole)}
              className="h-10 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
            >
              {SIGNER_ROLES.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
          </div>
          <Button
            type="button"
            variant="primary"
            className="h-10 gap-2 shrink-0"
            disabled={!label.trim() || isAdding}
            onClick={handleAdd}
          >
            <Plus className="h-4 w-4" />
            {t('builder.signerSlot.addSigner')}
          </Button>
        </div>
      </div>

      {signers.length > 0 ? (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {t('detail.signers')}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {signers.length}
            </span>
          </div>

          <StaggerChildren className="space-y-2">
            {signers.map((s, i) => (
              <StaggerItem key={s.id}>
                <div className="group flex items-center gap-3 rounded-xl border border-th-border bg-th-card p-3.5 transition-colors hover:border-primary/20">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5">
                    <span className="text-sm font-semibold text-primary">{i + 1}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-foreground">{s.label}</p>
                    <span className={`mt-1 inline-flex rounded-full border px-2 py-0.5 text-[10px] font-medium ${ROLE_COLORS[s.role] ?? 'bg-th-hover text-foreground-muted border-th-border'}`}>
                      {getRoleLabel(s.role)}
                    </span>
                  </div>
                  <button
                    type="button"
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-error/10 hover:text-error"
                    onClick={() => onRemove(s.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </div>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-hover text-foreground-subtle">
            <Users className="h-6 w-6" />
          </div>
          <p className="text-sm text-foreground-muted">
            {t('detail.noSigners')}
          </p>
        </div>
      )}
    </div>
  );
}

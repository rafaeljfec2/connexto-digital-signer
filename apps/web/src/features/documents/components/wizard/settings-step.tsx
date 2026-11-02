"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, ArrowRight, RotateCcw, X } from 'lucide-react';
import type { ReminderInterval, SigningLanguage } from '@/features/documents/api';
import {
  useEnvelope,
  useUpdateEnvelope,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Input, LabelWithTooltip, Select } from '@/shared/ui';

export type SettingsStepProps = {
  readonly envelopeId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onCancel: () => void;
  readonly onNext: () => void;
};

export function SettingsStep({ envelopeId, onBack, onRestart, onCancel, onNext }: SettingsStepProps) {
  const tSettings = useTranslations('settings');
  const tWizard = useTranslations('wizard');
  const { data: envelope } = useEnvelope(envelopeId);
  const updateEnvelopeMutation = useUpdateEnvelope(envelopeId);

  const [deadline, setDeadline] = useState('');
  const [reminderInterval, setReminderInterval] = useState<ReminderInterval>('none');
  const [signingLanguage, setSigningLanguage] = useState<SigningLanguage>('pt-br');

  useEffect(() => {
    if (!envelope) return;
    setDeadline(envelope.expiresAt ? envelope.expiresAt.split('T')[0] : '');
    setReminderInterval(envelope.reminderInterval);
    setSigningLanguage(envelope.signingLanguage);
  }, [envelope]);

  const daysRemaining = useMemo(() => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [deadline]);

  const handleSaveAndContinue = useCallback(() => {
    updateEnvelopeMutation.mutate(
      {
        expiresAt: deadline ? new Date(deadline).toISOString() : null,
        reminderInterval,
        signingLanguage,
        closureMode: 'automatic',
      },
      { onSuccess: () => onNext() },
    );
  }, [deadline, reminderInterval, signingLanguage, updateEnvelopeMutation, onNext]);

  return (
    <Card variant="glass" className="w-full p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-medium text-foreground">{tSettings('title')}</h2>
        <p className="mt-1 text-sm text-foreground-muted">{tSettings('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div>
          <LabelWithTooltip
            label={tSettings('deadlineLabel')}
            tooltip={tWizard('tooltips.deadline')}
            className="mb-1.5"
            muted
          />
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          {deadline ? (
            <p className={`mt-1 text-xs ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-400' : 'text-foreground-subtle'}`}>
              {daysRemaining !== null && daysRemaining < 0
                ? tSettings('deadlineExpired')
                : tSettings('deadlineHelper', { days: daysRemaining ?? 0 })}
            </p>
          ) : null}
        </div>

        <div>
          <LabelWithTooltip
            label={tSettings('reminderLabel')}
            tooltip={tWizard('tooltips.reminder')}
            className="mb-1.5"
            muted
          />
          <Select
            value={reminderInterval}
            onChange={(e) => setReminderInterval(e.target.value as ReminderInterval)}
          >
            <option value="none">{tSettings('reminderNone')}</option>
            <option value="1_day">{tSettings('reminder1Day')}</option>
            <option value="2_days">{tSettings('reminder2Days')}</option>
            <option value="3_days">{tSettings('reminder3Days')}</option>
            <option value="7_days">{tSettings('reminder7Days')}</option>
          </Select>
          <p className="mt-1 text-xs text-foreground-subtle">{tSettings('reminderHelper')}</p>
        </div>

        <div>
          <LabelWithTooltip
            label={tSettings('languageLabel')}
            tooltip={tWizard('tooltips.signingLanguage')}
            className="mb-1.5"
            muted
          />
          <Select
            value={signingLanguage}
            onChange={(e) => setSigningLanguage(e.target.value as SigningLanguage)}
          >
            <option value="pt-br">{tSettings('languagePtBr')}</option>
            <option value="en">{tSettings('languageEn')}</option>
          </Select>
        </div>
      </div>

      <div className="mt-8 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button variant="ghost" onClick={onBack}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            {tWizard('back')}
          </Button>
          <Button variant="ghost" onClick={onRestart}>
            <RotateCcw className="mr-1 h-4 w-4" />
            {tWizard('restart')}
          </Button>
          <Button variant="ghost" className="text-error hover:text-error/80" onClick={onCancel}>
            <X className="mr-1 h-4 w-4" />
            {tWizard('cancel')}
          </Button>
        </div>
        <Button
          onClick={handleSaveAndContinue}
          disabled={updateEnvelopeMutation.isPending}
        >
          {tWizard('next')}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

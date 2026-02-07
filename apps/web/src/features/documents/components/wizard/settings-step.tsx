"use client";

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ArrowLeft, RotateCcw, ArrowRight, Info } from 'lucide-react';
import type { ClosureMode, ReminderInterval, SigningLanguage } from '@/features/documents/api';
import {
  useDocument,
  useUpdateDocument,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Input, Select } from '@/shared/ui';

export type SettingsStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onNext: () => void;
};

export function SettingsStep({ documentId, onBack, onRestart, onNext }: SettingsStepProps) {
  const tSettings = useTranslations('settings');
  const tWizard = useTranslations('wizard');
  const { data: document } = useDocument(documentId);
  const updateDocumentMutation = useUpdateDocument(documentId);

  const [deadline, setDeadline] = useState('');
  const [reminderInterval, setReminderInterval] = useState<ReminderInterval>('none');
  const [signingLanguage, setSigningLanguage] = useState<SigningLanguage>('pt-br');
  const [closureMode, setClosureMode] = useState<ClosureMode>('automatic');

  useEffect(() => {
    if (!document) return;
    setDeadline(document.expiresAt ? document.expiresAt.split('T')[0] : '');
    setReminderInterval(document.reminderInterval);
    setSigningLanguage(document.signingLanguage);
    setClosureMode(document.closureMode);
  }, [document]);

  const daysRemaining = useMemo(() => {
    if (!deadline) return null;
    const diff = new Date(deadline).getTime() - Date.now();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  }, [deadline]);

  const handleSaveAndContinue = useCallback(() => {
    updateDocumentMutation.mutate(
      {
        expiresAt: deadline ? new Date(deadline).toISOString() : null,
        reminderInterval,
        signingLanguage,
        closureMode,
      },
      { onSuccess: () => onNext() },
    );
  }, [deadline, reminderInterval, signingLanguage, closureMode, updateDocumentMutation, onNext]);

  return (
    <Card variant="glass" className="w-full p-6 md:p-8">
      <div className="mb-6">
        <h2 className="text-xl font-semibold text-white">{tSettings('title')}</h2>
        <p className="mt-1 text-sm text-white/60">{tSettings('subtitle')}</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            {tSettings('deadlineLabel')}
          </label>
          <Input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            min={new Date().toISOString().split('T')[0]}
          />
          {deadline ? (
            <p className={`mt-1 text-xs ${daysRemaining !== null && daysRemaining < 0 ? 'text-red-400' : 'text-white/50'}`}>
              {daysRemaining !== null && daysRemaining < 0
                ? tSettings('deadlineExpired')
                : tSettings('deadlineHelper', { days: daysRemaining ?? 0 })}
            </p>
          ) : null}
        </div>

        <div>
          <label className="mb-1.5 block text-sm font-medium text-white/80">
            {tSettings('reminderLabel')}
          </label>
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
          <p className="mt-1 text-xs text-white/50">{tSettings('reminderHelper')}</p>
        </div>
      </div>

      <div className="mt-6">
        <label className="mb-1.5 block text-sm font-medium text-white/80">
          {tSettings('languageLabel')}
        </label>
        <Select
          value={signingLanguage}
          onChange={(e) => setSigningLanguage(e.target.value as SigningLanguage)}
          className="max-w-xs"
        >
          <option value="pt-br">{tSettings('languagePtBr')}</option>
          <option value="en">{tSettings('languageEn')}</option>
        </Select>
      </div>

      <hr className="my-6 border-white/10" />

      <div>
        <h3 className="mb-4 text-base font-semibold text-white">{tSettings('closureTitle')}</h3>

        <div className="flex flex-col gap-3">
          <label
            aria-label={tSettings('closureAutomatic')}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              closureMode === 'automatic'
                ? 'border-accent/50 bg-accent/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="closureMode"
              value="automatic"
              checked={closureMode === 'automatic'}
              onChange={() => setClosureMode('automatic')}
              className="mt-1 accent-accent"
            />
            <div>
              <span className="block text-sm font-medium text-white">
                {tSettings('closureAutomatic')}
              </span>
              <span className="mt-0.5 block text-xs text-white/50">
                {tSettings('closureAutomaticDesc')}
              </span>
            </div>
          </label>

          <label
            aria-label={tSettings('closureManual')}
            className={`flex cursor-pointer items-start gap-3 rounded-lg border p-4 transition-colors ${
              closureMode === 'manual'
                ? 'border-accent/50 bg-accent/10'
                : 'border-white/10 bg-white/5 hover:border-white/20'
            }`}
          >
            <input
              type="radio"
              name="closureMode"
              value="manual"
              checked={closureMode === 'manual'}
              onChange={() => setClosureMode('manual')}
              className="mt-1 accent-accent"
            />
            <div>
              <span className="block text-sm font-medium text-white">
                {tSettings('closureManual')}
              </span>
              <span className="mt-0.5 block text-xs text-white/50">
                {tSettings('closureManualDesc')}
              </span>
            </div>
          </label>
        </div>

        <div className="mt-4 flex items-start gap-2 rounded-lg border border-accent/20 bg-accent/5 p-3">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-accent-400" />
          <p className="text-xs text-white/60">{tSettings('closureNote')}</p>
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
        </div>
        <Button
          onClick={handleSaveAndContinue}
          disabled={updateDocumentMutation.isPending}
        >
          {tWizard('next')}
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </div>
    </Card>
  );
}

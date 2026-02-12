"use client";

import { useCallback, useState } from 'react';
import { ArrowRight, RefreshCw, UserCheck } from 'lucide-react';
import { Button, Card, Input } from '@/shared/ui';
import { formatCpf, isValidCpf } from '@/shared/utils/cpf';

type IdentifyStepLabels = Readonly<{
  title: string;
  instruction: string;
  emailLabel: string;
  emailPlaceholder: string;
  cpfLabel: string;
  cpfPlaceholder: string;
  phoneLabel: string;
  phonePlaceholder: string;
  next: string;
  emailRequired: string;
  cpfRequired: string;
  phoneRequired: string;
  error: string;
}>;

type IdentifyStepProps = Readonly<{
  requestEmail: boolean;
  requestCpf: boolean;
  requestPhone: boolean;
  onIdentify: (input: { email?: string; cpf?: string; phone?: string }) => Promise<unknown>;
  onNext: () => void;
  isSubmitting: boolean;
  labels: IdentifyStepLabels;
}>;

function EmailField({ value, onChange, label, placeholder, errorMessage, showError }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  errorMessage: string;
  showError: boolean;
}>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-normal text-foreground-muted">{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="email"
        inputMode="email"
        autoComplete="email"
      />
      {showError ? <p className="text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

function CpfField({ value, onChange, label, placeholder, errorMessage, showError }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  errorMessage: string;
  showError: boolean;
}>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-normal text-foreground-muted">{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(formatCpf(event.target.value))}
        placeholder={placeholder}
        inputMode="numeric"
      />
      {showError ? <p className="text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

function PhoneField({ value, onChange, label, placeholder, errorMessage, showError }: Readonly<{
  value: string;
  onChange: (v: string) => void;
  label: string;
  placeholder: string;
  errorMessage: string;
  showError: boolean;
}>) {
  return (
    <div className="space-y-1.5">
      <label className="text-sm font-normal text-foreground-muted">{label}</label>
      <Input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        type="tel"
        inputMode="tel"
      />
      {showError ? <p className="text-xs text-error">{errorMessage}</p> : null}
    </div>
  );
}

export function IdentifyStep({
  requestEmail,
  requestCpf,
  requestPhone,
  onIdentify,
  onNext,
  isSubmitting,
  labels,
}: IdentifyStepProps) {
  const [emailValue, setEmailValue] = useState('');
  const [cpf, setCpf] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);

  const isEmailValid = !requestEmail || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailValue);
  const cpfDigits = cpf.replaceAll(/\D/g, '');
  const isCpfComplete = cpfDigits.length === 11;
  const isCpfValid = !requestCpf || (isCpfComplete && isValidCpf(cpf));
  const isPhoneValid = !requestPhone || phone.replaceAll(/\D/g, '').length >= 8;
  const canSubmit = isEmailValid && isCpfValid && isPhoneValid;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setError(null);

    try {
      await onIdentify({
        email: requestEmail ? emailValue : undefined,
        cpf: requestCpf ? cpf : undefined,
        phone: requestPhone ? phone : undefined,
      });
      onNext();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : labels.error;
      const axiosMessage = (err as { response?: { data?: { message?: string } } })?.response?.data?.message;
      setError(axiosMessage ?? message);
    }
  }, [canSubmit, emailValue, cpf, phone, requestEmail, requestCpf, requestPhone, onIdentify, onNext, labels.error]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center overflow-auto">
        <Card variant="glass" className="w-full space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-primary/20">
              <UserCheck className="h-7 w-7 text-primary" />
            </div>
            <h2 className="text-lg font-medium">{labels.title}</h2>
            <p className="text-sm text-foreground-muted">
              {labels.instruction}
            </p>
          </div>

          <div className="space-y-4">
            {requestEmail ? (
              <EmailField
                value={emailValue}
                onChange={setEmailValue}
                label={labels.emailLabel}
                placeholder={labels.emailPlaceholder}
                errorMessage={labels.emailRequired}
                showError={emailValue.length > 0 && !isEmailValid}
              />
            ) : null}

            {requestCpf ? (
              <CpfField
                value={cpf}
                onChange={setCpf}
                label={labels.cpfLabel}
                placeholder={labels.cpfPlaceholder}
                errorMessage={labels.cpfRequired}
                showError={cpf.length > 0 && !isCpfValid}
              />
            ) : null}

            {requestPhone ? (
              <PhoneField
                value={phone}
                onChange={setPhone}
                label={labels.phoneLabel}
                placeholder={labels.phonePlaceholder}
                errorMessage={labels.phoneRequired}
                showError={phone.length > 0 && !isPhoneValid}
              />
            ) : null}

            {error ? (
              <p className="text-center text-sm font-medium text-error">
                {error}
              </p>
            ) : null}

            <Button
              variant="primary"
              className="w-full"
              onClick={handleSubmit}
              disabled={!canSubmit || isSubmitting}
            >
              {isSubmitting ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : null}
              {labels.next}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );
}

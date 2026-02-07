"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button, Card } from '@/shared/ui';

type ValidateStepProps = Readonly<{
  onSendCode: () => Promise<unknown>;
  onVerifyCode: (code: string) => Promise<unknown>;
  onNext: () => void;
  onBack: () => void;
  isSending: boolean;
  isVerifying: boolean;
  verifyError: string | null;
  labels: Readonly<{
    title: string;
    instruction: string;
    sendCode: string;
    resendCode: string;
    resendInFormat: (seconds: number) => string;
    placeholder: string;
    verify: string;
    invalidCode: string;
    expiredCode: string;
    back: string;
  }>;
}>;

const RESEND_COOLDOWN_SECONDS = 60;
const OTP_LENGTH = 6;

export function ValidateStep({
  onSendCode,
  onVerifyCode,
  onNext,
  onBack,
  isSending,
  isVerifying,
  verifyError,
  labels,
}: ValidateStepProps) {
  const [codeSent, setCodeSent] = useState(false);
  const [otp, setOtp] = useState<string[]>(Array.from({ length: OTP_LENGTH }, () => ''));
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  const handleSendCode = useCallback(async () => {
    await onSendCode();
    setCodeSent(true);
    setCountdown(RESEND_COOLDOWN_SECONDS);
    setOtp(Array.from({ length: OTP_LENGTH }, () => ''));
    setTimeout(() => inputRefs.current[0]?.focus(), 100);
  }, [onSendCode]);

  const handleInputChange = useCallback(
    (index: number, value: string) => {
      if (!/^\d*$/.test(value)) return;

      const newOtp = [...otp];

      if (value.length > 1) {
        const chars = value.slice(0, OTP_LENGTH).split('');
        for (let i = 0; i < chars.length && index + i < OTP_LENGTH; i++) {
          newOtp[index + i] = chars[i];
        }
        setOtp(newOtp);
        const nextIdx = Math.min(index + chars.length, OTP_LENGTH - 1);
        inputRefs.current[nextIdx]?.focus();
        return;
      }

      newOtp[index] = value;
      setOtp(newOtp);

      if (value && index < OTP_LENGTH - 1) {
        inputRefs.current[index + 1]?.focus();
      }
    },
    [otp]
  );

  const handleKeyDown = useCallback(
    (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Backspace' && !otp[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    },
    [otp]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData.getData('text').replaceAll(/\D/g, '').slice(0, OTP_LENGTH);
      if (pasted.length === 0) return;

      const newOtp = Array.from({ length: OTP_LENGTH }, () => '');
      for (let i = 0; i < pasted.length; i++) {
        newOtp[i] = pasted[i];
      }
      setOtp(newOtp);
      const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
      inputRefs.current[focusIdx]?.focus();
    },
    []
  );

  const fullCode = otp.join('');
  const isCodeComplete = fullCode.length === OTP_LENGTH;

  const handleVerify = useCallback(async () => {
    if (!isCodeComplete) return;
    await onVerifyCode(fullCode);
    onNext();
  }, [fullCode, isCodeComplete, onVerifyCode, onNext]);

  return (
    <div className="flex flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-lg flex-1 items-center overflow-auto">
        <Card variant="glass" className="w-full space-y-6 p-6 md:p-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-accent-400/20">
              <ShieldCheck className="h-7 w-7 text-accent-400" />
            </div>
            <h2 className="text-lg font-bold">{labels.title}</h2>
            {codeSent ? (
              <p className="text-sm text-neutral-100/60">
                {labels.instruction}
              </p>
            ) : null}
          </div>

          {codeSent ? (
            <div className="flex flex-col items-center gap-5">
              <div className="flex justify-center gap-2">
                {otp.map((_, idx) => (
                  <input
                    key={`otp-digit-${OTP_LENGTH}-${idx}`}
                    ref={(el) => { inputRefs.current[idx] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={OTP_LENGTH}
                    value={otp[idx]}
                    onChange={(e) => handleInputChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                    onPaste={handlePaste}
                    className="h-12 w-10 rounded-lg border-2 border-white/20 bg-white/5 text-center text-xl font-bold text-white outline-none transition-all focus:border-accent-400 focus:ring-1 focus:ring-accent-400/50 md:h-14 md:w-12 md:text-2xl"
                    placeholder="0"
                    autoComplete="one-time-code"
                  />
                ))}
              </div>

              {verifyError ? (
                <p className="text-center text-sm font-medium text-error">
                  {verifyError}
                </p>
              ) : null}

              <Button
                variant="primary"
                className="w-full"
                onClick={handleVerify}
                disabled={!isCodeComplete || isVerifying}
              >
                {isVerifying ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {labels.verify}
              </Button>

              <button
                type="button"
                onClick={handleSendCode}
                disabled={countdown > 0 || isSending}
                className="text-sm font-medium text-accent-400 transition-colors hover:text-accent-300 disabled:text-neutral-100/30 disabled:hover:text-neutral-100/30"
              >
                {countdown > 0
                  ? labels.resendInFormat(countdown)
                  : labels.resendCode}
              </button>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4">
              <p className="text-center text-sm text-neutral-100/60">
                {labels.instruction}
              </p>
              <Button
                variant="primary"
                className="w-full"
                onClick={handleSendCode}
                disabled={isSending}
              >
                {isSending ? (
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                {labels.sendCode}
              </Button>
            </div>
          )}
        </Card>
      </div>

      <div className="fixed inset-x-0 bottom-0 border-t border-white/10 bg-gradient-main/95 px-4 py-3 backdrop-blur-sm">
        <div className="mx-auto flex max-w-6xl justify-between">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
            {labels.back}
          </Button>
          {codeSent ? (
            <Button
              variant="primary"
              onClick={handleVerify}
              disabled={!isCodeComplete || isVerifying}
            >
              {labels.verify}
              <ArrowRight className="ml-1.5 h-3.5 w-3.5" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}

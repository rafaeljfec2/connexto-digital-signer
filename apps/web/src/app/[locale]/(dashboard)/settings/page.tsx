"use client";

import { useCallback, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ShieldCheck,
  Upload,
  Trash2,
  Award,
  Calendar,
  User,
  Building2,
  Globe,
  Bell,
  Key,
  Copy,
  Check,
  RefreshCw,
} from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, Input, Select } from '@/shared/ui';
import {
  useCertificateStatus,
  useUploadCertificate,
  useRemoveCertificate,
} from '@/features/settings/hooks/use-certificate';
import {
  useBranding,
  useUpdateBranding,
  useUploadLogo,
  useDefaults,
  useUpdateDefaults,
  useNotifications,
  useUpdateNotifications,
  useApiKeyStatus,
  useRegenerateApiKey,
} from '@/features/settings/hooks/use-settings';

function formatDate(isoDate: string, locale: string): string {
  try {
    return new Intl.DateTimeFormat(locale === 'pt-br' ? 'pt-BR' : 'en-US', {
      dateStyle: 'long',
      timeStyle: 'short',
    }).format(new Date(isoDate));
  } catch {
    return isoDate;
  }
}

function SectionHeader({
  icon,
  title,
  description,
}: {
  readonly icon: React.ReactNode;
  readonly title: string;
  readonly description: string;
}) {
  return (
    <div className="mb-4 space-y-1">
      <div className="flex items-center gap-2">
        {icon}
        <h2 className="text-base font-medium text-foreground">{title}</h2>
      </div>
      <p className="text-xs text-foreground-muted">{description}</p>
    </div>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  readonly icon: React.ReactNode;
  readonly label: string;
  readonly value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-lg bg-th-input/40 p-2.5">
      <span className="mt-0.5 text-foreground-muted">{icon}</span>
      <div className="min-w-0 flex-1">
        <p className="text-[11px] font-medium uppercase tracking-wide text-foreground-muted">{label}</p>
        <p className="truncate text-sm text-foreground">{value}</p>
      </div>
    </div>
  );
}

function FieldSkeleton() {
  return <div className="h-10 rounded-lg bg-th-input animate-pulse" />;
}

function BrandingSection() {
  const t = useTranslations('common.branding');
  const { data, isLoading } = useBranding();
  const updateMutation = useUpdateBranding();
  const logoMutation = useUploadLogo();
  const [companyName, setCompanyName] = useState('');
  const [primaryColor, setPrimaryColor] = useState('#0E3A6E');
  const [initialized, setInitialized] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  if (data && !initialized) {
    setCompanyName(data.companyName);
    setPrimaryColor(data.primaryColor);
    setInitialized(true);
  }

  const handleSave = useCallback(async () => {
    await updateMutation.mutateAsync({ name: companyName, primaryColor });
  }, [companyName, primaryColor, updateMutation]);

  const handleLogoChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await logoMutation.mutateAsync(file);
    },
    [logoMutation],
  );

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        icon={<Building2 className="h-5 w-5 text-accent" />}
        title={t('title')}
        description={t('description')}
      />
      {isLoading ? (
        <div className="space-y-3">
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted">{t('companyNameLabel')}</label>
              <Input
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder={t('companyNamePlaceholder')}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted">{t('primaryColorLabel')}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-12 cursor-pointer rounded-lg border border-th-input-border bg-th-input"
                />
                <Input
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 font-mono text-xs"
                  maxLength={7}
                />
              </div>
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">{t('logoLabel')}</label>
            <div className="flex items-center gap-3">
              {data?.logoUrl ? (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg border border-th-input-border bg-th-input">
                  <Building2 className="h-6 w-6 text-foreground-muted" />
                </div>
              ) : null}
              <Button
                type="button"
                variant="secondary"
                className="text-xs"
                onClick={() => logoInputRef.current?.click()}
                isLoading={logoMutation.isPending}
              >
                <Upload className="h-3.5 w-3.5" />
                {data?.logoUrl ? t('logoChange') : t('logoUpload')}
              </Button>
              <span className="text-[11px] text-foreground-subtle">{t('logoHint')}</span>
              <input
                ref={logoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={handleLogoChange}
              />
            </div>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSave}
            isLoading={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function DefaultsSection() {
  const t = useTranslations('common.defaults');
  const { data, isLoading } = useDefaults();
  const updateMutation = useUpdateDefaults();
  const [language, setLanguage] = useState('pt-br');
  const [reminder, setReminder] = useState('none');
  const [closure, setClosure] = useState('automatic');
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setLanguage(data.defaultSigningLanguage);
    setReminder(data.defaultReminderInterval);
    setClosure(data.defaultClosureMode);
    setInitialized(true);
  }

  const handleSave = useCallback(async () => {
    await updateMutation.mutateAsync({
      defaultSigningLanguage: language,
      defaultReminderInterval: reminder,
      defaultClosureMode: closure,
    });
  }, [language, reminder, closure, updateMutation]);

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        icon={<Globe className="h-5 w-5 text-accent" />}
        title={t('title')}
        description={t('description')}
      />
      {isLoading ? (
        <div className="space-y-3">
          <FieldSkeleton />
          <FieldSkeleton />
          <FieldSkeleton />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted">{t('languageLabel')}</label>
              <Select
                value={language}
                onChange={(e) => setLanguage(e.target.value)}
              >
                <option value="pt-br">{t('languagePtBr')}</option>
                <option value="en">{t('languageEn')}</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted">{t('reminderLabel')}</label>
              <Select
                value={reminder}
                onChange={(e) => setReminder(e.target.value)}
              >
                <option value="none">{t('reminderNone')}</option>
                <option value="1_day">{t('reminder1Day')}</option>
                <option value="2_days">{t('reminder2Days')}</option>
                <option value="3_days">{t('reminder3Days')}</option>
                <option value="7_days">{t('reminder7Days')}</option>
              </Select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground-muted">{t('closureLabel')}</label>
              <Select
                value={closure}
                onChange={(e) => setClosure(e.target.value)}
              >
                <option value="automatic">{t('closureAutomatic')}</option>
                <option value="manual">{t('closureManual')}</option>
              </Select>
            </div>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSave}
            isLoading={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function NotificationsSection() {
  const t = useTranslations('common.notifications');
  const { data, isLoading } = useNotifications();
  const updateMutation = useUpdateNotifications();
  const [senderName, setSenderName] = useState('');
  const [initialized, setInitialized] = useState(false);

  if (data && !initialized) {
    setSenderName(data.emailSenderName);
    setInitialized(true);
  }

  const handleSave = useCallback(async () => {
    await updateMutation.mutateAsync({ emailSenderName: senderName });
  }, [senderName, updateMutation]);

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        icon={<Bell className="h-5 w-5 text-accent" />}
        title={t('title')}
        description={t('description')}
      />
      {isLoading ? (
        <FieldSkeleton />
      ) : (
        <div className="space-y-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-foreground-muted">{t('senderNameLabel')}</label>
            <Input
              value={senderName}
              onChange={(e) => setSenderName(e.target.value)}
              placeholder={t('senderNamePlaceholder')}
            />
            <p className="text-[11px] text-foreground-subtle">{t('senderNameHint')}</p>
          </div>
          <Button
            type="button"
            className="w-full sm:w-auto"
            onClick={handleSave}
            isLoading={updateMutation.isPending}
          >
            {updateMutation.isPending ? t('saving') : t('save')}
          </Button>
        </div>
      )}
    </Card>
  );
}

function ApiKeySection() {
  const t = useTranslations('common.apiKey');
  const { data, isLoading } = useApiKeyStatus();
  const regenerateMutation = useRegenerateApiKey();
  const [showConfirm, setShowConfirm] = useState(false);
  const [newKey, setNewKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleRegenerate = useCallback(async () => {
    try {
      const result = await regenerateMutation.mutateAsync();
      setNewKey(result.apiKey);
      setShowConfirm(false);
    } catch {
      /* error handled by mutation */
    }
  }, [regenerateMutation]);

  const handleCopy = useCallback(async () => {
    if (!newKey) return;
    await navigator.clipboard.writeText(newKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [newKey]);

  return (
    <>
      <Card variant="glass" className="p-5 sm:p-6">
        <SectionHeader
          icon={<Key className="h-5 w-5 text-accent" />}
          title={t('title')}
          description={t('description')}
        />
        {isLoading ? (
          <FieldSkeleton />
        ) : (
          <div className="space-y-4">
            {data?.configured ? (
              <div className="flex items-center gap-3 rounded-lg bg-th-input/40 p-3">
                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-success/15">
                  <Key className="h-4 w-4 text-success" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-foreground">{t('configured')}</p>
                  {data.lastFour ? (
                    <p className="text-xs text-foreground-muted">
                      {t('lastFour')}: <span className="font-mono">sk_...{data.lastFour}</span>
                    </p>
                  ) : null}
                </div>
              </div>
            ) : (
              <p className="text-sm text-foreground-muted">{t('notConfigured')}</p>
            )}
            <Button
              type="button"
              variant="secondary"
              className="w-full sm:w-auto"
              onClick={() => setShowConfirm(true)}
              isLoading={regenerateMutation.isPending}
            >
              <RefreshCw className="h-4 w-4" />
              {regenerateMutation.isPending ? t('regenerating') : t('regenerate')}
            </Button>
          </div>
        )}
      </Card>

      <ConfirmDialog
        open={showConfirm}
        title={t('regenerateTitle')}
        description={t('regenerateConfirm')}
        confirmLabel={t('regenerate')}
        cancelLabel={t('regenerateCancel')}
        isLoading={regenerateMutation.isPending}
        variant="warning"
        onConfirm={handleRegenerate}
        onCancel={() => setShowConfirm(false)}
      />

      {newKey ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
          <div className="absolute inset-0 bg-th-overlay backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-th-card-border bg-th-dialog p-6 text-foreground shadow-2xl backdrop-blur-xl">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <Key className="h-5 w-5 text-accent" />
                <h3 className="text-base font-medium">{t('newKeyTitle')}</h3>
              </div>
              <p className="text-xs text-warning">{t('newKeyWarning')}</p>
              <div className="flex items-center gap-2 rounded-lg bg-th-input p-3">
                <code className="flex-1 break-all text-xs text-foreground">{newKey}</code>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="flex-shrink-0 rounded-md p-1.5 transition hover:bg-th-hover"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-success" />
                  ) : (
                    <Copy className="h-4 w-4 text-foreground-muted" />
                  )}
                </button>
              </div>
              <Button
                type="button"
                className="w-full"
                onClick={() => setNewKey(null)}
              >
                {t('close')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}

function CertificateUploadForm() {
  const t = useTranslations('common.certificate');
  const [file, setFile] = useState<File | null>(null);
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadMutation = useUploadCertificate();

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selected = e.target.files?.[0];
      if (!selected) return;
      const name = selected.name.toLowerCase();
      if (!name.endsWith('.p12') && !name.endsWith('.pfx')) {
        setError(t('invalidFile'));
        setFile(null);
        return;
      }
      setError('');
      setFile(selected);
    },
    [t],
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!file) { setError(t('invalidFile')); return; }
      if (!password.trim()) return;
      setError('');
      try {
        await uploadMutation.mutateAsync({ file, password: password.trim() });
        setFile(null);
        setPassword('');
      } catch {
        setError(t('invalidPassword'));
      }
    },
    [file, password, t, uploadMutation],
  );

  const handleDragOver = useCallback((e: React.DragEvent) => { e.preventDefault(); e.stopPropagation(); }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const dropped = e.dataTransfer.files[0];
      if (!dropped) return;
      const name = dropped.name.toLowerCase();
      if (!name.endsWith('.p12') && !name.endsWith('.pfx')) { setError(t('invalidFile')); return; }
      setError('');
      setFile(dropped);
    },
    [t],
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">{t('uploadLabel')}</label>
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className="flex w-full flex-col items-center gap-2 rounded-xl border-2 border-dashed border-th-input-border bg-th-input/50 p-6 transition hover:border-accent/50 hover:bg-th-input/80"
        >
          <Upload className="h-8 w-8 text-foreground-muted" />
          {file ? (
            <span className="text-sm font-medium text-foreground">{file.name}</span>
          ) : (
            <>
              <span className="text-sm text-foreground-muted">{t('dropzoneHint')}</span>
              <span className="text-xs text-foreground-subtle">{t('dropzoneAccept')}</span>
            </>
          )}
        </button>
        <input ref={fileInputRef} type="file" accept=".p12,.pfx" className="hidden" onChange={handleFileChange} />
      </div>
      <div className="space-y-1.5">
        <label className="text-xs font-medium text-foreground-muted">{t('passwordLabel')}</label>
        <Input type="password" placeholder={t('passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="off" />
      </div>
      {error && <p className="text-xs text-error">{error}</p>}
      <Button type="submit" className="w-full" disabled={!file || !password.trim()} isLoading={uploadMutation.isPending}>
        <ShieldCheck className="h-4 w-4" />
        {uploadMutation.isPending ? t('submitting') : t('submit')}
      </Button>
    </form>
  );
}

function CertificateInfo({
  subject, issuer, expiresAt, configuredAt, isExpired,
}: {
  readonly subject: string;
  readonly issuer: string;
  readonly expiresAt: string;
  readonly configuredAt: string;
  readonly isExpired: boolean;
}) {
  const t = useTranslations('common.certificate');
  const [showConfirm, setShowConfirm] = useState(false);
  const removeMutation = useRemoveCertificate();

  const handleRemove = useCallback(async () => {
    try { await removeMutation.mutateAsync(); setShowConfirm(false); } catch { /* handled */ }
  }, [removeMutation]);

  const locale = globalThis.window ? (globalThis.window.location.pathname.split('/')[1] ?? 'pt-br') : 'pt-br';

  return (
    <>
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-success/15">
            <ShieldCheck className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">{t('configured')}</p>
            <Badge variant={isExpired ? 'danger' : 'success'}>{isExpired ? t('expired') : t('valid')}</Badge>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InfoRow icon={<User className="h-3.5 w-3.5" />} label={t('subject')} value={subject} />
          <InfoRow icon={<Building2 className="h-3.5 w-3.5" />} label={t('issuer')} value={issuer} />
          <InfoRow icon={<Calendar className="h-3.5 w-3.5" />} label={t('expires')} value={formatDate(expiresAt, locale)} />
          <InfoRow icon={<Award className="h-3.5 w-3.5" />} label={t('configuredAt')} value={formatDate(configuredAt, locale)} />
        </div>
        <Button type="button" variant="destructive" className="w-full" onClick={() => setShowConfirm(true)} isLoading={removeMutation.isPending}>
          <Trash2 className="h-4 w-4" />
          {removeMutation.isPending ? t('removing') : t('remove')}
        </Button>
      </div>
      <ConfirmDialog
        open={showConfirm} title={t('removeTitle')} description={t('removeConfirm')}
        confirmLabel={t('remove')} cancelLabel={t('removeCancel')}
        isLoading={removeMutation.isPending} variant="danger"
        onConfirm={handleRemove} onCancel={() => setShowConfirm(false)}
      />
    </>
  );
}

function CertificateSection() {
  const tCert = useTranslations('common.certificate');
  const { data, isLoading } = useCertificateStatus();

  const renderContent = () => {
    if (isLoading) {
      return (
        <div className="space-y-3 animate-pulse">
          <div className="h-10 w-10 rounded-full bg-th-input" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {['s', 'i', 'e', 'c'].map((k) => <div key={k} className="h-14 rounded-lg bg-th-input" />)}
          </div>
        </div>
      );
    }
    if (data?.configured && data.certificate) {
      return (
        <CertificateInfo
          subject={data.certificate.subject} issuer={data.certificate.issuer}
          expiresAt={data.certificate.expiresAt} configuredAt={data.certificate.configuredAt}
          isExpired={data.certificate.isExpired}
        />
      );
    }
    return <CertificateUploadForm />;
  };

  return (
    <Card variant="glass" className="p-5 sm:p-6">
      <SectionHeader
        icon={<ShieldCheck className="h-5 w-5 text-accent" />}
        title={tCert('title')}
        description={tCert('description')}
      />
      {renderContent()}
    </Card>
  );
}

export default function SettingsPage() {
  const tCommon = useTranslations('common');

  return (
    <div className="space-y-5">
      <div className="space-y-2">
        <h1 className="text-2xl font-medium text-foreground">{tCommon('settingsTitle')}</h1>
        <p className="text-sm text-foreground-muted">{tCommon('settingsSubtitle')}</p>
      </div>

      <BrandingSection />
      <DefaultsSection />
      <NotificationsSection />
      <ApiKeySection />
      <CertificateSection />
    </div>
  );
}

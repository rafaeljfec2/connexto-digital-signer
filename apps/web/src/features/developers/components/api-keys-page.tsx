"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Copy, Key, Plus, Trash2 } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/shared/ui';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FadeIn, PageTransition, StaggerChildren, StaggerItem } from '@/shared/animations';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '../hooks/use-api-keys';
import type { ApiKeyCreateResponse } from '../api';

const ALL_SCOPES = [
  'documents:read',
  'documents:write',
  'webhooks:manage',
  'templates:read',
  'templates:write',
  'signers:manage',
  'envelopes:read',
  'envelopes:write',
] as const;

export function ApiKeysPage() {
  const t = useTranslations('developers');
  const { data: keys, isLoading } = useApiKeys();
  const createMutation = useCreateApiKey();
  const revokeMutation = useRevokeApiKey();

  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState('');
  const [selectedScopes, setSelectedScopes] = useState<string[]>([...ALL_SCOPES]);
  const [createdKey, setCreatedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [revokeId, setRevokeId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) return;
    const result = await createMutation.mutateAsync({
      name: name.trim(),
      scopes: selectedScopes,
    });
    setCreatedKey(result);
    setName('');
    setSelectedScopes([...ALL_SCOPES]);
    setShowCreate(false);
  };

  const handleCopy = async (text: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const toggleScope = (scope: string) => {
    setSelectedScopes((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope],
    );
  };

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('apiKeys.title')}</h1>
            <p className="mt-1 text-sm text-foreground-subtle">{t('apiKeys.description')}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('apiKeys.create')}
          </Button>
        </div>
      </FadeIn>

      {createdKey !== null && (
        <Card className="mb-6 border-green-500/30 bg-green-500/5 p-4">
          <p className="mb-2 text-sm font-medium text-green-400">{t('apiKeys.createdWarning')}</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 overflow-auto rounded bg-black/20 px-3 py-2 font-mono text-xs text-foreground">
              {createdKey.rawKey}
            </code>
            <Button variant="ghost" onClick={() => handleCopy(createdKey.rawKey)}>
              <Copy className="h-4 w-4" />
              {copied ? t('apiKeys.copied') : t('apiKeys.copy')}
            </Button>
          </div>
          <Button variant="ghost" className="mt-2" onClick={() => setCreatedKey(null)}>
            {t('apiKeys.dismiss')}
          </Button>
        </Card>
      )}

      {showCreate && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-lg font-semibold text-foreground">{t('apiKeys.createTitle')}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-foreground-subtle">{t('apiKeys.name')}</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t('apiKeys.namePlaceholder')}
                autoFocus
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-foreground-subtle">{t('apiKeys.scopes')}</label>
              <div className="flex flex-wrap gap-2">
                {ALL_SCOPES.map((scope) => (
                  <button
                    key={scope}
                    type="button"
                    onClick={() => toggleScope(scope)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedScopes.includes(scope)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-th-border text-foreground-subtle hover:border-primary/50'
                    }`}
                  >
                    {scope}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending || !name.trim()}>
                {createMutation.isPending ? t('apiKeys.creating') : t('apiKeys.createBtn')}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                {t('apiKeys.cancel')}
              </Button>
            </div>
          </div>
        </Card>
      )}

      <StaggerChildren>
        {isLoading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-xl bg-th-card" />
            ))}
          </div>
        )}
        {keys?.map((key) => (
          <StaggerItem key={key.id}>
            <Card className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium text-foreground">{key.name}</p>
                  <p className="font-mono text-xs text-foreground-subtle">
                    {key.keyPrefix}...{key.keyLastFour}
                  </p>
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {key.scopes.map((s) => (
                  <Badge key={s} variant="info" className="text-[10px]">{s}</Badge>
                ))}
              </div>
              <div className="flex items-center gap-4 text-xs text-foreground-subtle">
                <span>{t('apiKeys.requests', { count: key.totalRequests })}</span>
                {key.lastUsedAt !== null && (
                  <span>{t('apiKeys.lastUsed', { date: new Date(key.lastUsedAt).toLocaleDateString() })}</span>
                )}
                <button
                  type="button"
                  onClick={() => setRevokeId(key.id)}
                  className="text-red-400 transition-colors hover:text-red-300"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </Card>
          </StaggerItem>
        ))}
        {!isLoading && keys?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-12">
            <Key className="h-10 w-10 text-foreground-subtle" />
            <p className="text-sm text-foreground-subtle">{t('apiKeys.empty')}</p>
          </Card>
        )}
      </StaggerChildren>

      <ConfirmDialog
        open={revokeId !== null}
        title={t('apiKeys.revokeTitle')}
        description={t('apiKeys.revokeDescription')}
        confirmLabel={t('apiKeys.revokeConfirm')}
        cancelLabel={t('apiKeys.cancel')}
        onConfirm={async () => {
          if (revokeId) await revokeMutation.mutateAsync(revokeId);
          setRevokeId(null);
        }}
        onCancel={() => setRevokeId(null)}
        variant="danger"
      />
    </PageTransition>
  );
}

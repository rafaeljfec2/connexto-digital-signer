"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Globe, Plus, Trash2, Zap, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/shared/ui';
import { ConfirmDialog } from '@/shared/ui/confirm-dialog';
import { FadeIn, PageTransition, StaggerChildren, StaggerItem } from '@/shared/animations';
import {
  useWebhooks,
  useCreateWebhook,
  useDeleteWebhook,
  useTestWebhook,
  useWebhookDeliveries,
} from '../hooks/use-webhooks';

const WEBHOOK_EVENTS = [
  'signer.added',
  'signer.notified',
  'signature.completed',
  'envelope.completed',
  'envelope.sent',
] as const;

function DeliveryLogs({ configId }: Readonly<{ configId: string }>) {
  const t = useTranslations('developers');
  const [page, setPage] = useState(1);
  const { data } = useWebhookDeliveries(configId, page);

  if (!data?.data.length) {
    return <p className="py-4 text-center text-xs text-foreground-subtle">{t('webhooks.noDeliveries')}</p>;
  }

  return (
    <div className="space-y-2">
      {data.data.map((d) => (
        <div key={d.id} className="flex items-center gap-3 rounded-lg bg-th-surface px-3 py-2 text-xs">
          <Badge variant={d.success ? 'success' : 'danger'} className="text-[10px]">
            {d.statusCode ?? 'ERR'}
          </Badge>
          <span className="text-foreground-subtle">{d.event}</span>
          <span className="text-foreground-subtle">{d.duration}ms</span>
          <span className="ml-auto text-foreground-subtle">
            {new Date(d.createdAt).toLocaleString()}
          </span>
        </div>
      ))}
      {data.total > 20 && (
        <div className="flex justify-center gap-2 pt-2">
          <Button variant="ghost" disabled={page <= 1} onClick={() => setPage(page - 1)}>
            <RotateCcw className="h-3 w-3" />
          </Button>
          <span className="text-xs text-foreground-subtle">{page}</span>
          <Button
            variant="ghost"
            disabled={page * 20 >= data.total}
            onClick={() => setPage(page + 1)}
          >
            →
          </Button>
        </div>
      )}
    </div>
  );
}

export function WebhooksPage() {
  const t = useTranslations('developers');
  const { data: webhooks, isLoading } = useWebhooks();
  const createMutation = useCreateWebhook();
  const deleteMutation = useDeleteWebhook();
  const testMutation = useTestWebhook();

  const [showCreate, setShowCreate] = useState(false);
  const [url, setUrl] = useState('');
  const [secret, setSecret] = useState('');
  const [selectedEvents, setSelectedEvents] = useState<string[]>([...WEBHOOK_EVENTS]);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const handleCreate = async () => {
    if (!url.trim() || !secret.trim()) return;
    await createMutation.mutateAsync({
      url: url.trim(),
      secret: secret.trim(),
      events: selectedEvents,
    });
    setUrl('');
    setSecret('');
    setSelectedEvents([...WEBHOOK_EVENTS]);
    setShowCreate(false);
  };

  const toggleEvent = (event: string) => {
    setSelectedEvents((prev) =>
      prev.includes(event) ? prev.filter((e) => e !== event) : [...prev, event],
    );
  };

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">{t('webhooks.title')}</h1>
            <p className="mt-1 text-sm text-foreground-subtle">{t('webhooks.description')}</p>
          </div>
          <Button onClick={() => setShowCreate(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            {t('webhooks.create')}
          </Button>
        </div>
      </FadeIn>

      {showCreate && (
        <Card className="mb-6 p-5">
          <h3 className="mb-4 text-lg font-semibold text-foreground">{t('webhooks.createTitle')}</h3>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-foreground-subtle">{t('webhooks.url')}</label>
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://api.example.com/webhooks"
                autoFocus
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-foreground-subtle">{t('webhooks.secret')}</label>
              <Input
                value={secret}
                onChange={(e) => setSecret(e.target.value)}
                placeholder="whsec_..."
              />
            </div>
            <div>
              <label className="mb-2 block text-sm text-foreground-subtle">{t('webhooks.events')}</label>
              <div className="flex flex-wrap gap-2">
                {WEBHOOK_EVENTS.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      selectedEvents.includes(event)
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-th-border text-foreground-subtle hover:border-primary/50'
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleCreate} disabled={createMutation.isPending}>
                {createMutation.isPending ? t('webhooks.creating') : t('webhooks.createBtn')}
              </Button>
              <Button variant="ghost" onClick={() => setShowCreate(false)}>
                {t('webhooks.cancel')}
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
        {webhooks?.map((wh) => (
          <StaggerItem key={wh.id}>
            <Card className="p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                    <Globe className="h-5 w-5 text-violet-400" />
                  </div>
                  <div>
                    <p className="font-mono text-sm text-foreground">{wh.url}</p>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {wh.events.map((e) => (
                        <Badge key={e} variant="info" className="text-[10px]">{e}</Badge>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={wh.isActive ? 'success' : 'danger'}>
                    {wh.isActive ? t('webhooks.active') : t('webhooks.inactive')}
                  </Badge>
                  <Button
                    variant="ghost"
                    onClick={() => testMutation.mutate(wh.id)}
                    disabled={testMutation.isPending}
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    onClick={() => setExpandedId(expandedId === wh.id ? null : wh.id)}
                  >
                    {expandedId === wh.id ? (
                      <ChevronUp className="h-4 w-4" />
                    ) : (
                      <ChevronDown className="h-4 w-4" />
                    )}
                  </Button>
                  <button
                    type="button"
                    onClick={() => setDeleteId(wh.id)}
                    className="text-red-400 transition-colors hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              {expandedId === wh.id && (
                <div className="mt-4 border-t border-th-border pt-4">
                  <h4 className="mb-2 text-sm font-medium text-foreground">{t('webhooks.deliveryHistory')}</h4>
                  <DeliveryLogs configId={wh.id} />
                </div>
              )}
            </Card>
          </StaggerItem>
        ))}
        {!isLoading && webhooks?.length === 0 && (
          <Card className="flex flex-col items-center gap-3 py-12">
            <Globe className="h-10 w-10 text-foreground-subtle" />
            <p className="text-sm text-foreground-subtle">{t('webhooks.empty')}</p>
          </Card>
        )}
      </StaggerChildren>

      <ConfirmDialog
        open={deleteId !== null}
        title={t('webhooks.deleteTitle')}
        description={t('webhooks.deleteDescription')}
        confirmLabel={t('webhooks.deleteConfirm')}
        cancelLabel={t('webhooks.cancel')}
        onConfirm={async () => {
          if (deleteId) await deleteMutation.mutateAsync(deleteId);
          setDeleteId(null);
        }}
        onCancel={() => setDeleteId(null)}
        variant="danger"
      />
    </PageTransition>
  );
}

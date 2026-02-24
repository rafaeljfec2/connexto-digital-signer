"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Check, Copy, Key, Webhook, BookOpen, Activity, Rocket, ArrowRight } from 'lucide-react';
import { Badge, Card } from '@/shared/ui';
import { FadeIn, PageTransition, StaggerChildren, StaggerItem } from '@/shared/animations';
import { useApiKeys } from '../hooks/use-api-keys';
import { useWebhooks } from '../hooks/use-webhooks';
import { Link } from '@/i18n/navigation';

const CURL_SNIPPET = String.raw`curl -X POST \
  {{BASE_URL}}/documents \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"title": "Contract", "envelopeId": "ENVELOPE_ID"}'`;

const NODE_SNIPPET = `const response = await fetch('{{BASE_URL}}/documents', {
  method: 'POST',
  headers: {
    'x-api-key': process.env.DIGITAL_SIGNER_API_KEY,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    title: 'Contract',
    envelopeId: 'ENVELOPE_ID',
  }),
});
const data = await response.json();`;

const WEBHOOK_SNIPPET = String.raw`curl -X POST \
  {{BASE_URL}}/webhooks/configs \
  -H "x-api-key: YOUR_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-app.com/webhooks",
    "secret": "whsec_your_secret",
    "events": ["signature.completed", "envelope.completed"]
  }'`;

function CodeBlock({ code, language }: Readonly<{ code: string; language: string }>) {
  const [copied, setCopied] = useState(false);
  const baseUrl = process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:3000/digital-signer/v1';
  const rendered = code.replaceAll('{{BASE_URL}}', baseUrl);

  const handleCopy = async () => {
    await navigator.clipboard.writeText(rendered);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative overflow-hidden rounded-lg border border-gray-700/50">
      <div className="flex items-center justify-between bg-gray-800 px-3 py-1.5">
        <span className="text-[10px] font-medium uppercase text-gray-400">{language}</span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1 text-xs text-gray-400 transition-colors hover:text-gray-200"
        >
          {copied ? <Check className="h-3 w-3 text-green-400" /> : <Copy className="h-3 w-3" />}
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-auto bg-gray-900 p-4 text-xs leading-relaxed text-gray-200">
        <code>{rendered}</code>
      </pre>
    </div>
  );
}

export function QuickStartPage() {
  const t = useTranslations('developers');
  const { data: keys } = useApiKeys();
  const { data: webhooks } = useWebhooks();

  const hasApiKey = (keys?.length ?? 0) > 0;
  const hasWebhook = (webhooks?.length ?? 0) > 0;

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/60">
              <Rocket className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground">{t('quickStart.title')}</h1>
              <p className="text-sm text-foreground-subtle">{t('quickStart.description')}</p>
            </div>
          </div>
        </div>
      </FadeIn>

      <div className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="flex items-center gap-3 p-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${hasApiKey ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            {hasApiKey ? <Check className="h-4 w-4 text-green-400" /> : <Key className="h-4 w-4 text-amber-400" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">{t('quickStart.apiKeyStatus')}</p>
            <p className="text-[10px] text-foreground-subtle">
              {hasApiKey ? t('quickStart.configured') : t('quickStart.notConfigured')}
            </p>
          </div>
          {!hasApiKey && (
            <Link href="/developers/api-keys">
              <ArrowRight className="h-4 w-4 text-foreground-subtle" />
            </Link>
          )}
        </Card>
        <Card className="flex items-center gap-3 p-4">
          <div className={`flex h-8 w-8 items-center justify-center rounded-full ${hasWebhook ? 'bg-green-500/10' : 'bg-amber-500/10'}`}>
            {hasWebhook ? <Check className="h-4 w-4 text-green-400" /> : <Webhook className="h-4 w-4 text-amber-400" />}
          </div>
          <div className="flex-1">
            <p className="text-xs font-medium text-foreground">{t('quickStart.webhookStatus')}</p>
            <p className="text-[10px] text-foreground-subtle">
              {hasWebhook ? t('quickStart.configured') : t('quickStart.notConfigured')}
            </p>
          </div>
          {!hasWebhook && (
            <Link href="/developers/webhooks">
              <ArrowRight className="h-4 w-4 text-foreground-subtle" />
            </Link>
          )}
        </Card>
        <Link href="/developers/logs">
          <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-primary/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">{t('quickStart.viewLogs')}</p>
          </Card>
        </Link>
        <Link href="/developers/docs">
          <Card className="flex h-full items-center gap-3 p-4 transition-colors hover:border-primary/30">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
              <BookOpen className="h-4 w-4 text-primary" />
            </div>
            <p className="text-xs font-medium text-foreground">{t('quickStart.viewDocs')}</p>
          </Card>
        </Link>
      </div>

      <StaggerChildren>
        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary">1</Badge>
              <h3 className="font-semibold text-foreground">{t('quickStart.step1Title')}</h3>
            </div>
            <p className="mb-4 text-sm text-foreground-subtle">{t('quickStart.step1Description')}</p>
            <CodeBlock code={CURL_SNIPPET} language="cURL" />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary">2</Badge>
              <h3 className="font-semibold text-foreground">{t('quickStart.step2Title')}</h3>
            </div>
            <p className="mb-4 text-sm text-foreground-subtle">{t('quickStart.step2Description')}</p>
            <CodeBlock code={NODE_SNIPPET} language="Node.js" />
          </Card>
        </StaggerItem>
        <StaggerItem>
          <Card className="p-5">
            <div className="mb-4 flex items-center gap-2">
              <Badge className="bg-primary/10 text-primary">3</Badge>
              <h3 className="font-semibold text-foreground">{t('quickStart.step3Title')}</h3>
            </div>
            <p className="mb-4 text-sm text-foreground-subtle">{t('quickStart.step3Description')}</p>
            <CodeBlock code={WEBHOOK_SNIPPET} language="cURL" />
          </Card>
        </StaggerItem>
      </StaggerChildren>
    </PageTransition>
  );
}

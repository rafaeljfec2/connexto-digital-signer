"use client";

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Activity, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Badge, Button, Card, Input } from '@/shared/ui';
import { FadeIn, PageTransition, StaggerChildren, StaggerItem } from '@/shared/animations';
import { useApiLogs, useApiLogStats } from '../hooks/use-api-logs';

const METHOD_COLORS: Record<string, string> = {
  GET: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30',
  POST: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
  PATCH: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
  PUT: 'bg-orange-500/10 text-orange-400 border-orange-500/30',
  DELETE: 'bg-red-500/10 text-red-400 border-red-500/30',
};

function StatusBadge({ code }: Readonly<{ code: number }>) {
  let variant: 'success' | 'warning' | 'danger' = 'danger';
  if (code < 300) variant = 'success';
  else if (code < 400) variant = 'warning';
  return <Badge variant={variant} className="font-mono text-[10px]">{code}</Badge>;
}

export function ApiLogsPage() {
  const t = useTranslations('developers');
  const [page, setPage] = useState(1);
  const [methodFilter, setMethodFilter] = useState('');
  const [pathFilter, setPathFilter] = useState('');

  const { data: logs, isLoading } = useApiLogs({
    page,
    limit: 20,
    method: methodFilter || undefined,
    path: pathFilter || undefined,
  });

  const { data: stats } = useApiLogStats();

  return (
    <PageTransition>
      <FadeIn>
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">{t('logs.title')}</h1>
          <p className="mt-1 text-sm text-foreground-subtle">{t('logs.description')}</p>
        </div>
      </FadeIn>

      {stats && (
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.totalRequests.toLocaleString()}</p>
            <p className="text-xs text-foreground-subtle">{t('logs.totalRequests')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-emerald-400">{stats.successCount.toLocaleString()}</p>
            <p className="text-xs text-foreground-subtle">{t('logs.successCount')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-red-400">{stats.errorCount.toLocaleString()}</p>
            <p className="text-xs text-foreground-subtle">{t('logs.errorCount')}</p>
          </Card>
          <Card className="p-4 text-center">
            <p className="text-2xl font-bold text-foreground">{stats.avgDuration}ms</p>
            <p className="text-xs text-foreground-subtle">{t('logs.avgDuration')}</p>
          </Card>
        </div>
      )}

      {stats?.topEndpoints && stats.topEndpoints.length > 0 && (
        <Card className="mb-6 p-4">
          <h3 className="mb-3 text-sm font-semibold text-foreground">{t('logs.topEndpoints')}</h3>
          <div className="space-y-2">
            {stats.topEndpoints.slice(0, 5).map((ep, i) => (
              <div key={`${ep.method}-${ep.path}`} className="flex items-center gap-3 text-xs">
                <span className="w-5 text-foreground-subtle">{i + 1}.</span>
                <Badge className={`font-mono text-[10px] ${METHOD_COLORS[ep.method] ?? ''}`}>
                  {ep.method}
                </Badge>
                <span className="flex-1 truncate font-mono text-foreground-subtle">{ep.path}</span>
                <span className="font-medium text-foreground">{ep.count}</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      <Card className="mb-4 p-3">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <ArrowUpDown className="hidden h-4 w-4 text-foreground-subtle sm:block" />
          <select
            value={methodFilter}
            onChange={(e) => { setMethodFilter(e.target.value); setPage(1); }}
            className="rounded-lg border border-th-border bg-th-input px-3 py-1.5 text-sm text-foreground"
          >
            <option value="">{t('logs.allMethods')}</option>
            <option value="GET">GET</option>
            <option value="POST">POST</option>
            <option value="PATCH">PATCH</option>
            <option value="PUT">PUT</option>
            <option value="DELETE">DELETE</option>
          </select>
          <Input
            value={pathFilter}
            onChange={(e) => { setPathFilter(e.target.value); setPage(1); }}
            placeholder={t('logs.filterPath')}
            className="max-w-xs text-sm"
          />
        </div>
      </Card>

      <StaggerChildren>
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 animate-pulse rounded-lg bg-th-card" />
            ))}
          </div>
        )}
        {logs?.data.map((log) => (
          <StaggerItem key={log.id}>
            <div className="flex items-center gap-3 rounded-lg border border-th-border bg-th-card px-3 py-2.5 text-xs">
              <Badge className={`w-16 justify-center font-mono text-[10px] ${METHOD_COLORS[log.method] ?? ''}`}>
                {log.method}
              </Badge>
              <span className="flex-1 truncate font-mono text-foreground-subtle">{log.path}</span>
              <StatusBadge code={log.statusCode} />
              <span className="w-16 text-right text-foreground-subtle">{log.duration}ms</span>
              <span className="hidden w-32 text-right text-foreground-subtle sm:block">
                {new Date(log.createdAt).toLocaleString()}
              </span>
            </div>
          </StaggerItem>
        ))}
      </StaggerChildren>

      {logs && logs.total > 20 && (
        <div className="mt-4 flex items-center justify-center gap-3">
          <Button
            variant="ghost"
            disabled={page <= 1}
            onClick={() => setPage(page - 1)}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-foreground-subtle">
            {page} / {Math.ceil(logs.total / 20)}
          </span>
          <Button
            variant="ghost"
            disabled={page * 20 >= logs.total}
            onClick={() => setPage(page + 1)}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}

      {!isLoading && logs?.data.length === 0 && (
        <Card className="flex flex-col items-center gap-3 py-12">
          <Activity className="h-10 w-10 text-foreground-subtle" />
          <p className="text-sm text-foreground-subtle">{t('logs.empty')}</p>
        </Card>
      )}
    </PageTransition>
  );
}

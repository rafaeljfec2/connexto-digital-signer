'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { useRouter } from '@/i18n/navigation';
import { useDebounce } from '@/shared/hooks/use-debounce';
import { useTemplates, useDeleteTemplate } from '../hooks';
import type { TemplateSummary } from '../api';
import { Button, Card, ConfirmDialog, Skeleton } from '@/shared/ui';
import { FadeIn, PageTransition } from '@/shared/animations';
import {
  FileText,
  LayoutTemplate,
  MoreHorizontal,
  Pencil,
  Play,
  Plus,
  Search,
  Trash2,
  Users,
} from 'lucide-react';

type CategoryFilterProps = {
  readonly value: string;
  readonly onChange: (val: string) => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
};

function CategoryFilter({ value, onChange, t }: CategoryFilterProps) {
  const categories = ['all', 'legal', 'hr', 'finance', 'sales', 'other'] as const;
  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => (
        <button
          key={cat}
          type="button"
          onClick={() => onChange(cat === 'all' ? '' : cat)}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            (cat === 'all' && !value) || value === cat
              ? 'bg-primary text-white'
              : 'bg-th-hover text-foreground-muted hover:bg-th-active'
          }`}
        >
          {t(`categories.${cat}`)}
        </button>
      ))}
    </div>
  );
}

type TemplateCardProps = {
  readonly template: TemplateSummary;
  readonly onEdit: () => void;
  readonly onUse: () => void;
  readonly onDelete: () => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
};

function TemplateCard({ template, onEdit, onUse, onDelete, t }: TemplateCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <Card variant="glass" className="group relative flex flex-col gap-3 p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <LayoutTemplate className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-foreground">{template.name}</h3>
            {template.description ? (
              <p className="mt-0.5 line-clamp-1 text-xs text-foreground-muted">
                {template.description}
              </p>
            ) : null}
          </div>
        </div>
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-foreground-subtle transition-colors hover:bg-th-hover"
          >
            <MoreHorizontal className="h-4 w-4" />
          </button>
          {menuOpen ? (
            <>
              <button
                type="button"
                aria-label="Close menu"
                className="fixed inset-0 z-10 cursor-default"
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 z-20 mt-1 w-40 rounded-xl border border-th-border bg-th-card p-1 shadow-lg">
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground transition-colors hover:bg-th-hover"
                  onClick={() => { setMenuOpen(false); onEdit(); }}
                >
                  <Pencil className="h-3.5 w-3.5" />
                  {t('actions.edit')}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-foreground transition-colors hover:bg-th-hover"
                  onClick={() => { setMenuOpen(false); onUse(); }}
                >
                  <Play className="h-3.5 w-3.5" />
                  {t('actions.use')}
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-error transition-colors hover:bg-error/10"
                  onClick={() => { setMenuOpen(false); onDelete(); }}
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('actions.delete')}
                </button>
              </div>
            </>
          ) : null}
        </div>
      </div>
      <div className="flex items-center gap-4 text-xs text-foreground-muted">
        {template.category ? (
          <span className="rounded-full bg-th-hover px-2 py-0.5">{template.category}</span>
        ) : null}
        <span className="flex items-center gap-1">
          <FileText className="h-3 w-3" />
          {template.documentCount}
        </span>
        <span className="flex items-center gap-1">
          <Users className="h-3 w-3" />
          {template.signerCount}
        </span>
        <span className="ml-auto">
          {template.usageCount} {t('detail.usage').toLowerCase()}
        </span>
      </div>
      <Button
        type="button"
        variant="primary"
        className="mt-1 w-full gap-2"
        onClick={onUse}
      >
        <Play className="h-3.5 w-3.5" />
        {t('actions.use')}
      </Button>
    </Card>
  );
}

type TemplatesContentProps = {
  readonly isLoading: boolean;
  readonly templates: ReadonlyArray<TemplateSummary>;
  readonly onEdit: (id: string) => void;
  readonly onUse: (id: string) => void;
  readonly onDelete: (tmpl: TemplateSummary) => void;
  readonly onCreate: () => void;
  readonly t: ReturnType<typeof useTranslations<'templates'>>;
};

function TemplatesContent({
  isLoading,
  templates,
  onEdit,
  onUse,
  onDelete,
  onCreate,
  t,
}: TemplatesContentProps) {
  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} variant="glass" className="space-y-3 p-5">
            <div className="flex items-center gap-3">
              <Skeleton className="h-10 w-10 shrink-0 rounded-xl" />
              <div className="flex-1 space-y-1.5">
                <Skeleton className="h-4 w-3/5" />
                <Skeleton className="h-3 w-2/5" />
              </div>
            </div>
            <Skeleton className="h-9 w-full" />
          </Card>
        ))}
      </div>
    );
  }

  if (templates.length === 0) {
    return (
      <Card variant="glass" className="flex flex-col items-center gap-4 p-12 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
          <LayoutTemplate className="h-8 w-8" />
        </div>
        <h3 className="text-lg font-medium text-foreground">{t('empty.title')}</h3>
        <p className="max-w-md text-sm text-foreground-muted">{t('empty.description')}</p>
        <Button type="button" variant="primary" className="gap-2" onClick={onCreate}>
          <Plus className="h-4 w-4" />
          {t('empty.cta')}
        </Button>
      </Card>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
      {templates.map((tmpl) => (
        <TemplateCard
          key={tmpl.id}
          template={tmpl}
          onEdit={() => onEdit(tmpl.id)}
          onUse={() => onUse(tmpl.id)}
          onDelete={() => onDelete(tmpl)}
          t={t}
        />
      ))}
    </div>
  );
}

export function TemplatesList() {
  const t = useTranslations('templates');
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<TemplateSummary | null>(null);

  const debouncedSearch = useDebounce(search, 400);

  const query = useTemplates({
    search: debouncedSearch || undefined,
    category: category || undefined,
    isActive: true,
  });

  const deleteMutation = useDeleteTemplate();

  const templates = query.data?.data ?? [];

  const handleConfirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <PageTransition className="space-y-5">
      <FadeIn>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl font-medium text-foreground">{t('title')}</h1>
            <p className="text-sm text-foreground-muted">{t('subtitle')}</p>
          </div>
          <Button
            type="button"
            variant="primary"
            className="w-full gap-2 sm:w-auto"
            onClick={() => router.push('/templates/new')}
          >
            <Plus className="h-4 w-4" />
            {t('actions.create')}
          </Button>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-foreground-subtle" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t('form.namePlaceholder')}
              className="h-9 w-full rounded-xl border border-th-border bg-th-input pl-9 pr-4 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
            />
          </div>
          <CategoryFilter value={category} onChange={setCategory} t={t} />
        </div>
      </FadeIn>

      <TemplatesContent
        isLoading={query.isLoading}
        templates={templates}
        onEdit={(id) => router.push(`/templates/${id}`)}
        onUse={(id) => router.push(`/templates/${id}/use`)}
        onDelete={setDeleteTarget}
        onCreate={() => router.push('/templates/new')}
        t={t}
      />

      <ConfirmDialog
        open={deleteTarget !== null}
        title={t('deleteConfirm.title')}
        description={t('deleteConfirm.description')}
        confirmLabel={t('deleteConfirm.confirm')}
        cancelLabel={t('deleteConfirm.cancel')}
        isLoading={deleteMutation.isPending}
        onConfirm={handleConfirmDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </PageTransition>
  );
}

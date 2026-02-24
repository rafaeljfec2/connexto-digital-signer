'use client';

import { useTranslations } from 'next-intl';
import type { CreateTemplateInput } from '../../api';

type InfoStepProps = {
  readonly data: CreateTemplateInput;
  readonly onChange: (data: CreateTemplateInput) => void;
};

export function InfoStep({ data, onChange }: InfoStepProps) {
  const t = useTranslations('templates');

  return (
    <div className="space-y-4">
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('form.nameLabel')} *
        </label>
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder={t('form.namePlaceholder')}
          className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('form.descriptionLabel')}
        </label>
        <textarea
          value={data.description ?? ''}
          onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
          placeholder={t('form.descriptionPlaceholder')}
          rows={3}
          className="w-full rounded-xl border border-th-border bg-th-input px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
      <div>
        <label className="mb-1 block text-sm font-medium text-foreground">
          {t('form.categoryLabel')}
        </label>
        <input
          type="text"
          value={data.category ?? ''}
          onChange={(e) => onChange({ ...data, category: e.target.value || undefined })}
          placeholder={t('form.categoryPlaceholder')}
          className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
        />
      </div>
    </div>
  );
}

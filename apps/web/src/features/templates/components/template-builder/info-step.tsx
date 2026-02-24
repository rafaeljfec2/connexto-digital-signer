'use client';

import { useTranslations } from 'next-intl';
import { FileSignature, AlignLeft, Tag } from 'lucide-react';
import { LabelWithTooltip } from '@/shared/ui';
import type { CreateTemplateInput } from '../../api';

const CATEGORIES = ['legal', 'hr', 'finance', 'sales', 'other'] as const;

type InfoStepProps = {
  readonly data: CreateTemplateInput;
  readonly onChange: (data: CreateTemplateInput) => void;
};

export function InfoStep({ data, onChange }: InfoStepProps) {
  const t = useTranslations('templates');

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <LabelWithTooltip
          label={t('form.nameLabel')}
          tooltip={t('tooltips.templateName')}
          icon={<FileSignature className="h-4 w-4 text-primary" />}
          required
        />
        <input
          type="text"
          value={data.name}
          onChange={(e) => onChange({ ...data, name: e.target.value })}
          placeholder={t('form.namePlaceholder')}
          className="h-11 w-full rounded-xl border border-th-border bg-th-input px-4 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
          autoFocus
        />
      </div>

      <div className="space-y-1.5">
        <LabelWithTooltip
          label={t('form.descriptionLabel')}
          tooltip={t('tooltips.templateDescription')}
          icon={<AlignLeft className="h-4 w-4 text-primary" />}
        />
        <textarea
          value={data.description ?? ''}
          onChange={(e) => onChange({ ...data, description: e.target.value || undefined })}
          placeholder={t('form.descriptionPlaceholder')}
          rows={4}
          className="w-full rounded-xl border border-th-border bg-th-input px-4 py-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow resize-none"
        />
      </div>

      <div className="space-y-1.5">
        <LabelWithTooltip
          label={t('form.categoryLabel')}
          tooltip={t('tooltips.templateCategory')}
          icon={<Tag className="h-4 w-4 text-primary" />}
        />
        <div className="flex flex-wrap gap-2">
          {CATEGORIES.map((cat) => {
            const isSelected = data.category === cat;
            return (
              <button
                key={cat}
                type="button"
                onClick={() =>
                  onChange({ ...data, category: isSelected ? undefined : cat })
                }
                className={`rounded-full border px-4 py-2 text-sm font-medium transition-all ${
                  isSelected
                    ? 'border-primary bg-primary/10 text-primary shadow-sm'
                    : 'border-th-border bg-th-input text-foreground-muted hover:border-primary/30 hover:bg-primary/5'
                }`}
              >
                {t(`categories.${cat}`)}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

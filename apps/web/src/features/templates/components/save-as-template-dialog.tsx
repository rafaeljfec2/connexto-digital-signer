'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { toast } from 'sonner';
import { Button, Dialog } from '@/shared/ui';
import { useCreateTemplateFromEnvelope } from '../hooks';

type SaveAsTemplateDialogProps = {
  readonly open: boolean;
  readonly envelopeId: string;
  readonly onClose: () => void;
};

export function SaveAsTemplateDialog({
  open,
  envelopeId,
  onClose,
}: SaveAsTemplateDialogProps) {
  const t = useTranslations('templates');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');

  const mutation = useCreateTemplateFromEnvelope();

  const handleSubmit = async () => {
    if (!name.trim()) return;
    try {
      await mutation.mutateAsync({
        envelopeId,
        input: {
          name: name.trim(),
          description: description.trim() || undefined,
          category: category.trim() || undefined,
        },
      });
      toast.success(t('saveAsTemplate.success'));
      setName('');
      setDescription('');
      setCategory('');
      onClose();
    } catch {
      toast.error('Failed to create template');
    }
  };

  return (
    <Dialog open={open} title={t('saveAsTemplate.title')} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-foreground-muted">{t('saveAsTemplate.description')}</p>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t('saveAsTemplate.nameLabel')} *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('saveAsTemplate.namePlaceholder')}
            className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t('saveAsTemplate.descriptionLabel')}
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            className="w-full rounded-xl border border-th-border bg-th-input px-3 py-2 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-foreground">
            {t('saveAsTemplate.categoryLabel')}
          </label>
          <input
            type="text"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="h-10 w-full rounded-xl border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-1 focus:ring-primary/20"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="ghost" onClick={onClose}>
            {t('deleteConfirm.cancel')}
          </Button>
          <Button
            type="button"
            variant="primary"
            disabled={!name.trim() || mutation.isPending}
            onClick={handleSubmit}
          >
            {mutation.isPending ? t('saveAsTemplate.submitting') : t('saveAsTemplate.submit')}
          </Button>
        </div>
      </div>
    </Dialog>
  );
}

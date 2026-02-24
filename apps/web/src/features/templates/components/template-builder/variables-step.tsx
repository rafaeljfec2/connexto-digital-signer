'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Variable } from 'lucide-react';
import { Button } from '@/shared/ui';
import type { TemplateVariableInput, TemplateVariable, TemplateVariableType } from '../../api';

const VARIABLE_TYPES: ReadonlyArray<{ value: TemplateVariableType; label: string }> = [
  { value: 'text', label: 'Text' },
  { value: 'date', label: 'Date' },
  { value: 'number', label: 'Number' },
];

type VariablesStepProps = {
  readonly variables: ReadonlyArray<TemplateVariable>;
  readonly onSave: (variables: ReadonlyArray<TemplateVariableInput>) => void;
  readonly isSaving: boolean;
};

export function VariablesStep({ variables, onSave, isSaving }: VariablesStepProps) {
  const t = useTranslations('templates');

  const [items, setItems] = useState<TemplateVariableInput[]>(() =>
    variables.map((v) => ({
      key: v.key,
      label: v.label,
      type: v.type,
      required: v.required,
      defaultValue: v.defaultValue ?? undefined,
    })),
  );

  const addItem = () => {
    setItems([...items, { key: '', label: '', type: 'text', required: true }]);
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, patch: Partial<TemplateVariableInput>) => {
    setItems(items.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  };

  const handleSave = () => {
    const valid = items.filter((i) => i.key.trim() && i.label.trim());
    onSave(valid);
  };

  return (
    <div className="space-y-4">
      {items.map((item, index) => (
        <div
          key={`${item.key}-${item.label}`}
          className="space-y-3 rounded-xl border border-th-border bg-th-input p-4"
        >
          <div className="flex items-start gap-3">
            <Variable className="mt-2 h-5 w-5 shrink-0 text-primary" />
            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    {t('builder.variable.key')}
                  </label>
                  <input
                    type="text"
                    value={item.key}
                    onChange={(e) =>
                      updateItem(index, {
                        key: e.target.value.toLowerCase().replaceAll(/[^a-z0-9_]/g, ''),
                      })
                    }
                    placeholder={t('builder.variable.keyPlaceholder')}
                    className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 font-mono text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-foreground">
                    {t('builder.variable.label')}
                  </label>
                  <input
                    type="text"
                    value={item.label}
                    onChange={(e) => updateItem(index, { label: e.target.value })}
                    placeholder={t('builder.variable.labelPlaceholder')}
                    className="h-9 w-full rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
                  />
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <select
                  value={item.type ?? 'text'}
                  onChange={(e) =>
                    updateItem(index, { type: e.target.value as TemplateVariableType })
                  }
                  className="h-9 rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground focus:border-primary/40 focus:outline-none"
                >
                  {VARIABLE_TYPES.map((vt) => (
                    <option key={vt.value} value={vt.value}>{vt.label}</option>
                  ))}
                </select>
                <label className="flex items-center gap-2 text-xs text-foreground">
                  <input
                    type="checkbox"
                    checked={item.required !== false}
                    onChange={(e) => updateItem(index, { required: e.target.checked })}
                    className="rounded border-th-border"
                  />
                  {t('builder.variable.required')}
                </label>
                <input
                  type="text"
                  value={item.defaultValue ?? ''}
                  onChange={(e) => updateItem(index, { defaultValue: e.target.value || undefined })}
                  placeholder={t('builder.variable.defaultValue')}
                  className="h-9 flex-1 rounded-lg border border-th-border bg-th-card px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none"
                />
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              className="mt-1 h-8 w-8 shrink-0 p-0 text-error"
              onClick={() => removeItem(index)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      ))}

      <div className="flex items-center gap-3">
        <Button type="button" variant="ghost" className="gap-1.5" onClick={addItem}>
          <Plus className="h-4 w-4" />
          {t('builder.variable.addVariable')}
        </Button>
        <Button
          type="button"
          variant="primary"
          className="ml-auto"
          disabled={isSaving}
          onClick={handleSave}
        >
          {isSaving ? '...' : 'Save'}
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-foreground-muted">
          {t('detail.noVariables')}
        </p>
      ) : null}
    </div>
  );
}

'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Variable, Save, Braces } from 'lucide-react';
import { Button } from '@/shared/ui';
import { StaggerChildren, StaggerItem } from '@/shared/animations';
import type { TemplateVariableInput, TemplateVariable, TemplateVariableType } from '../../api';

const VARIABLE_TYPES: ReadonlyArray<{ readonly value: TemplateVariableType; readonly label: string; readonly icon: string }> = [
  { value: 'text', label: 'Texto', icon: 'Aa' },
  { value: 'date', label: 'Data', icon: '📅' },
  { value: 'number', label: 'Número', icon: '#' },
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
    <div className="space-y-5">
      {items.length > 0 ? (
        <>
          <div className="flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">
              {t('builder.variable.addVariable')}
            </p>
            <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {items.length}
            </span>
          </div>

          <StaggerChildren className="space-y-3">
            {items.map((item, index) => (
              <StaggerItem key={`var-${String(index)}-${item.key}`}>
                <div className="group rounded-xl border border-th-border bg-th-card p-4 transition-colors hover:border-primary/20">
                  <div className="flex items-start gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Braces className="h-4 w-4" />
                    </div>
                    <div className="flex-1 space-y-3">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground-muted">
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
                            className="h-9 w-full rounded-lg border border-th-border bg-th-input px-3 font-mono text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                          />
                        </div>
                        <div>
                          <label className="mb-1 block text-xs font-medium text-foreground-muted">
                            {t('builder.variable.label')}
                          </label>
                          <input
                            type="text"
                            value={item.label}
                            onChange={(e) => updateItem(index, { label: e.target.value })}
                            placeholder={t('builder.variable.labelPlaceholder')}
                            className="h-9 w-full rounded-lg border border-th-border bg-th-input px-3 text-sm text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                          />
                        </div>
                      </div>
                      <div className="flex flex-wrap items-center gap-3">
                        <div className="flex gap-1.5">
                          {VARIABLE_TYPES.map((vt) => (
                            <button
                              key={vt.value}
                              type="button"
                              onClick={() => updateItem(index, { type: vt.value })}
                              className={`flex items-center gap-1 rounded-lg border px-2.5 py-1.5 text-xs font-medium transition-all ${
                                (item.type ?? 'text') === vt.value
                                  ? 'border-primary bg-primary/10 text-primary'
                                  : 'border-th-border bg-th-input text-foreground-muted hover:border-primary/30'
                              }`}
                            >
                              <span>{vt.icon}</span>
                              {vt.label}
                            </button>
                          ))}
                        </div>
                        <label className="flex items-center gap-2 rounded-lg border border-th-border px-2.5 py-1.5 text-xs text-foreground transition-colors hover:border-primary/30">
                          <input
                            type="checkbox"
                            checked={item.required !== false}
                            onChange={(e) => updateItem(index, { required: e.target.checked })}
                            className="rounded border-th-border accent-primary"
                          />
                          {t('builder.variable.required')}
                        </label>
                        <input
                          type="text"
                          value={item.defaultValue ?? ''}
                          onChange={(e) => updateItem(index, { defaultValue: e.target.value || undefined })}
                          placeholder={t('builder.variable.defaultValue')}
                          className="h-8 flex-1 min-w-[120px] rounded-lg border border-th-border bg-th-input px-3 text-xs text-foreground placeholder:text-foreground-subtle focus:border-primary/40 focus:outline-none focus:ring-2 focus:ring-primary/20 transition-shadow"
                        />
                      </div>
                      {item.key ? (
                        <p className="rounded-lg bg-th-hover px-3 py-1.5 font-mono text-xs text-foreground-muted">
                          {`{{${item.key}}}`}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-8 w-8 shrink-0 p-0 text-foreground-subtle opacity-0 transition-opacity hover:text-error group-hover:opacity-100"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </StaggerItem>
            ))}
          </StaggerChildren>
        </>
      ) : (
        <div className="flex flex-col items-center gap-3 py-8 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-hover text-foreground-subtle">
            <Variable className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <p className="text-sm font-medium text-foreground">
              {t('detail.noVariables')}
            </p>
            <p className="text-xs text-foreground-muted">
              {t('builder.stepDescriptions.variables')}
            </p>
          </div>
        </div>
      )}

      <div className="flex items-center gap-3 border-t border-th-border pt-4">
        <Button type="button" variant="ghost" className="gap-2" onClick={addItem}>
          <Plus className="h-4 w-4" />
          {t('builder.variable.addVariable')}
        </Button>
        {items.length > 0 ? (
          <Button
            type="button"
            variant="primary"
            className="ml-auto gap-2"
            disabled={isSaving}
            onClick={handleSave}
          >
            <Save className="h-4 w-4" />
            {isSaving ? '...' : t('builder.save')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

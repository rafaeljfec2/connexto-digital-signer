'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { Plus, Trash2, Variable, Save, Braces, Check, AlertTriangle } from 'lucide-react';
import { Button } from '@/shared/ui';
import { StaggerChildren, StaggerItem } from '@/shared/animations';
import type { TemplateVariableInput, TemplateVariable, TemplateVariableType } from '../../api';

const VARIABLE_TYPES: ReadonlyArray<{ readonly value: TemplateVariableType; readonly label: string; readonly icon: string }> = [
  { value: 'text', label: 'Texto', icon: 'Aa' },
  { value: 'date', label: 'Data', icon: '📅' },
  { value: 'number', label: 'Número', icon: '#' },
];

type VariableItem = TemplateVariableInput & { readonly _stableId: string };

let nextStableId = 0;
const createStableId = (): string => `var-${String(++nextStableId)}`;

type VariablesStepProps = {
  readonly variables: ReadonlyArray<TemplateVariable>;
  readonly onSave: (variables: ReadonlyArray<TemplateVariableInput>) => Promise<void> | void;
  readonly isSaving: boolean;
};

export function VariablesStep({ variables, onSave, isSaving }: VariablesStepProps) {
  const t = useTranslations('templates');

  const [items, setItems] = useState<VariableItem[]>(() =>
    variables.map((v) => ({
      _stableId: createStableId(),
      key: v.key,
      label: v.label,
      type: v.type,
      required: v.required,
      defaultValue: v.defaultValue ?? undefined,
    })),
  );

  const addItem = useCallback(() => {
    setItems((prev) => [...prev, { _stableId: createStableId(), key: '', label: '', type: 'text', required: true }]);
  }, []);

  const removeItem = useCallback((index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateItem = useCallback((index: number, patch: Partial<TemplateVariableInput>) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, ...patch } : item)));
  }, []);

  const [saved, setSaved] = useState(false);
  const savedTimerRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    return () => {
      if (savedTimerRef.current) clearTimeout(savedTimerRef.current);
    };
  }, []);

  const duplicateKeys = useMemo(() => {
    const keys = items.map((i) => i.key.trim().toLowerCase()).filter(Boolean);
    const seen = new Set<string>();
    const duplicates = new Set<string>();
    for (const key of keys) {
      if (seen.has(key)) {
        duplicates.add(key);
      }
      seen.add(key);
    }
    return duplicates;
  }, [items]);

  const hasDuplicates = duplicateKeys.size > 0;

  const handleSave = useCallback(async () => {
    if (hasDuplicates) return;
    const valid = items
      .filter((i) => i.key.trim() && i.label.trim())
      .map(({ _stableId: _, ...rest }) => rest);
    try {
      await onSave(valid);
      setSaved(true);
      savedTimerRef.current = setTimeout(() => setSaved(false), 2500);
    } catch {
      setSaved(false);
    }
  }, [items, onSave, hasDuplicates]);

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
              <StaggerItem key={item._stableId}>
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
                            className={`h-9 w-full rounded-lg border bg-th-input px-3 font-mono text-sm text-foreground placeholder:text-foreground-subtle focus:outline-none focus:ring-2 transition-shadow ${
                              item.key && duplicateKeys.has(item.key.trim().toLowerCase())
                                ? 'border-error focus:border-error/40 focus:ring-error/20'
                                : 'border-th-border focus:border-primary/40 focus:ring-primary/20'
                            }`}
                          />
                          {item.key && duplicateKeys.has(item.key.trim().toLowerCase()) ? (
                            <p className="mt-1 flex items-center gap-1 text-xs text-error">
                              <AlertTriangle className="h-3 w-3" />
                              {t('builder.variable.duplicateKey')}
                            </p>
                          ) : null}
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
                    <button
                      type="button"
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-foreground-muted transition-colors hover:bg-error/10 hover:text-error"
                      onClick={() => removeItem(index)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
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
            variant={saved ? 'ghost' : 'primary'}
            className={`ml-auto gap-2 transition-all ${saved ? 'border-green-500 bg-green-500/10 text-green-500' : ''}`}
            disabled={isSaving || hasDuplicates}
            onClick={handleSave}
          >
            {saved ? (
              <Check className="h-4 w-4" />
            ) : (
              <Save className="h-4 w-4" />
            )}
            {isSaving && '...'}
            {!isSaving && saved && t('builder.variablesSaved')}
            {!isSaving && !saved && t('builder.save')}
          </Button>
        ) : null}
      </div>
    </div>
  );
}

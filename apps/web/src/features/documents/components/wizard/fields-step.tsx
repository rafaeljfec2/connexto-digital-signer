"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import {
  useBatchUpdateFields,
  useDocumentFile,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Avatar, Badge, Button, Card, Input } from '@/shared/ui';
import type { SignatureFieldInput } from '@/features/documents/api';
import {
  FieldPalette,
  PdfViewer,
  SignatureFieldType,
  usePdfFields,
} from '@/features/pdf-signature';

const fieldTypes: SignatureFieldType[] = ['signature', 'name', 'date', 'initials', 'text'];

const createTempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type FieldsStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onRestart: () => void;
  readonly onNext: () => void;
};

export function FieldsStep({ documentId, onBack, onRestart, onNext }: Readonly<FieldsStepProps>) {
  const tFields = useTranslations('fields');
  const tWizard = useTranslations('wizard');
  const signersQuery = useSigners(documentId);
  const fieldsQuery = useSignatureFields(documentId);
  const batchUpdate = useBatchUpdateFields(documentId);
  const fileQuery = useDocumentFile(documentId);
  const [activeSignerId, setActiveSignerId] = useState<string>('');
  const [selectedFieldId, setSelectedFieldId] = useState<string | null>(null);
  const pageRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());

  const initialFields = useMemo(() => fieldsQuery.data ?? undefined, [fieldsQuery.data]);
  const { fields, addField, moveField, removeField } = usePdfFields({
    initialFields,
  });

  useEffect(() => {
    if (signersQuery.data && signersQuery.data.length > 0 && !activeSignerId) {
      setActiveSignerId(signersQuery.data[0].id);
    }
  }, [signersQuery.data, activeSignerId]);

  const fileUrl = useMemo(() => {
    if (!fileQuery.data) return '';
    return URL.createObjectURL(fileQuery.data);
  }, [fileQuery.data]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const signerColors = useMemo(() => {
    const palette = ['#2563EB', '#16A34A', '#F97316', '#7C3AED', '#DC2626', '#0EA5E9'];
    return (signersQuery.data ?? []).reduce<Record<string, string>>((acc, signer, index) => {
      acc[signer.id] = palette[index % palette.length];
      return acc;
    }, {});
  }, [signersQuery.data]);

  const selectedField = useMemo(
    () => fields.find((field) => field.id === selectedFieldId) ?? null,
    [fields, selectedFieldId]
  );

  const handleSave = async () => {
    const payload: SignatureFieldInput[] = fields.map((field) => ({
      id: field.id.startsWith('temp-') ? undefined : field.id,
      signerId: field.signerId,
      type: field.type,
      page: field.page,
      x: field.x,
      y: field.y,
      width: field.width,
      height: field.height,
      required: field.required,
    }));
    await batchUpdate.mutateAsync(payload);
    await fieldsQuery.refetch();
    onNext();
  };

  const handlePageReady = useCallback((pageNumber: number, element: HTMLDivElement | null) => {
    pageRefs.current.set(pageNumber, element);
  }, []);

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const overId = event.over?.id?.toString();
      if (!overId?.startsWith('page-')) {
        return;
      }
      const pageNumber = Number(overId.replace('page-', ''));
      const container = pageRefs.current.get(pageNumber);
      if (!container) {
        return;
      }
      const rect = container.getBoundingClientRect();
      const pointer = event.activatorEvent as PointerEvent;
      const rawX = (pointer.clientX - rect.left) / rect.width;
      const rawY = (pointer.clientY - rect.top) / rect.height;
      const activeId = event.active.id.toString();

      if (activeId.startsWith('palette-')) {
        if (!activeSignerId) {
          return;
        }
        const type = activeId.replace('palette-', '') as SignatureFieldType;
        const width = 0.25;
        const height = 0.08;
        const x = clamp(rawX, 0, 1 - width);
        const y = clamp(rawY, 0, 1 - height);
        addField({
          id: createTempId(),
          signerId: activeSignerId,
          type,
          page: pageNumber,
          x,
          y,
          width,
          height,
          required: true,
          value: null,
        });
        return;
      }

      if (activeId.startsWith('field-')) {
        const fieldId = activeId.replace('field-', '');
        const current = fields.find((fieldItem) => fieldItem.id === fieldId);
        if (!current) {
          return;
        }
        const x = clamp(rawX, 0, 1 - current.width);
        const y = clamp(rawY, 0, 1 - current.height);
        moveField({ id: fieldId, x, y, page: pageNumber });
      }
    },
    [activeSignerId, addField, fields, moveField]
  );

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-white">{tFields('title')}</h2>
        <p className="text-sm text-neutral-100/70">{tFields('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr_320px]">
        <Card variant="glass" className="space-y-4 p-4">
          <FieldPalette
            signers={signersQuery.data ?? []}
            activeSignerId={activeSignerId}
            onSignerChange={setActiveSignerId}
            fieldTypes={fieldTypes}
            getFieldLabel={(type) => tFields(`type.${type}`)}
            signerColors={signerColors}
            activeSignerLabel={tFields('activeSigner')}
            paletteTitle={tFields('paletteTitle')}
            colorHint={tFields('paletteColorHint')}
          />
        </Card>
        <Card variant="glass" className="p-3">
          <DndContext onDragEnd={handleDragEnd}>
            {fileUrl ? (
              <PdfViewer
                fileUrl={fileUrl}
                fields={fields}
                signerColors={signerColors}
                getFieldLabel={(type) => tFields(`type.${type}`)}
                onRemoveField={removeField}
                onPageContainerReady={handlePageReady}
                selectedFieldId={selectedFieldId ?? undefined}
                onSelectField={(id) => setSelectedFieldId(id)}
              />
            ) : null}
          </DndContext>
        </Card>
        <Card variant="glass" className="space-y-4 p-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-100/70">
              {tFields('activeSigner')}
            </p>
            <div className="space-y-2">
              {(signersQuery.data ?? []).map((signer) => (
                <button
                  key={signer.id}
                  type="button"
                  onClick={() => setActiveSignerId(signer.id)}
                  className={`flex w-full items-center justify-between rounded-xl border px-3 py-2 text-left text-sm transition ${
                    activeSignerId === signer.id
                      ? 'border-white/40 bg-white/20 text-white'
                      : 'border-white/10 bg-white/5 text-neutral-100/70 hover:bg-white/10'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      name={signer.name}
                      size="sm"
                      statusColor={signerColors[signer.id] ?? '#14B8A6'}
                    />
                    <div>
                      <p className="font-semibold">{signer.name}</p>
                      <p className="text-xs text-neutral-100/70">{signer.email}</p>
                    </div>
                  </div>
                  <Badge variant={signer.status === 'signed' ? 'success' : 'info'}>
                    {signer.status === 'signed'
                      ? tFields('signerStatus.signed')
                      : tFields('signerStatus.pending')}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
          <div className="space-y-3 border-t border-white/10 pt-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-100/70">
              {tFields('properties.title')}
            </p>
            {selectedField ? (
              <div className="space-y-3 text-sm text-white">
                <div className="flex items-center justify-between">
                  <span>{tFields('properties.required')}</span>
                  <input
                    type="checkbox"
                    checked={selectedField.required}
                    onChange={(event) =>
                      moveField({ id: selectedField.id, required: event.target.checked })
                    }
                    className="h-4 w-4 accent-accent-400"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-100/70">
                      {tFields('properties.width')}
                    </label>
                    <Input
                      type="number"
                      min={0.05}
                      max={1}
                      step={0.01}
                      value={selectedField.width}
                      onChange={(event) =>
                        moveField({
                          id: selectedField.id,
                          width: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-neutral-100/70">
                      {tFields('properties.height')}
                    </label>
                    <Input
                      type="number"
                      min={0.03}
                      max={1}
                      step={0.01}
                      value={selectedField.height}
                      onChange={(event) =>
                        moveField({
                          id: selectedField.id,
                          height: Number(event.target.value),
                        })
                      }
                    />
                  </div>
                </div>
                <Button type="button" variant="ghost" onClick={() => removeField(selectedField.id)}>
                  {tFields('properties.remove')}
                </Button>
              </div>
            ) : (
              <p className="text-sm text-neutral-100/70">
                {tFields('properties.empty')}
              </p>
            )}
          </div>
        </Card>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button type="button" variant="ghost" onClick={onBack}>
            {tWizard('back')}
          </Button>
          <Button type="button" variant="ghost" onClick={onRestart} className="text-xs">
            {tWizard('restart')}
          </Button>
        </div>
        <Button type="button" onClick={handleSave} isLoading={batchUpdate.isPending}>
          {tWizard('next')}
        </Button>
      </div>
    </div>
  );
}

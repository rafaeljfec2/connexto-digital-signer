"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { DndContext, useDraggable, useDroppable } from '@dnd-kit/core';
import {
  useBatchUpdateFields,
  useDocumentFile,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Select } from '@/shared/ui';
import type { SignatureField, SignatureFieldInput, SignatureFieldType } from '@/features/documents/api';
import dynamic from 'next/dynamic';

const PdfViewer = dynamic(() => import('./pdf-viewer').then((mod) => mod.PdfViewer), {
  ssr: false,
});

type LocalField = SignatureField & {
  readonly tempId: string;
};

const fieldTypes: SignatureFieldType[] = [
  'signature',
  'name',
  'date',
  'initials',
  'text',
];

const createTempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

export type FieldsStepProps = {
  readonly documentId: string;
  readonly onBack: () => void;
  readonly onNext: () => void;
};

export function FieldsStep({ documentId, onBack, onNext }: Readonly<FieldsStepProps>) {
  const tFields = useTranslations('fields');
  const tWizard = useTranslations('wizard');
  const signersQuery = useSigners(documentId);
  const fieldsQuery = useSignatureFields(documentId);
  const batchUpdate = useBatchUpdateFields(documentId);
  const fileQuery = useDocumentFile(documentId);
  const [activeSignerId, setActiveSignerId] = useState<string>('');
  const [localFields, setLocalFields] = useState<LocalField[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);
  const page = 1;

  useEffect(() => {
    if (signersQuery.data && signersQuery.data.length > 0 && !activeSignerId) {
      setActiveSignerId(signersQuery.data[0].id);
    }
  }, [signersQuery.data, activeSignerId]);

  useEffect(() => {
    if (fieldsQuery.data) {
      setLocalFields(
        fieldsQuery.data.map((field) => ({ ...field, tempId: createTempId() }))
      );
    }
  }, [fieldsQuery.data]);

  const fileUrl = useMemo(() => {
    if (!fileQuery.data) return '';
    return URL.createObjectURL(fileQuery.data);
  }, [fileQuery.data]);

  useEffect(() => {
    return () => {
      if (fileUrl) URL.revokeObjectURL(fileUrl);
    };
  }, [fileUrl]);

  const handleSave = async () => {
    const payload: SignatureFieldInput[] = localFields.map((field) => ({
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

  const clamp = (value: number) => Math.min(1, Math.max(0, value));

  const handleDrop = (type: SignatureFieldType, x: number, y: number) => {
    if (!activeSignerId) return;
    const newField: LocalField = {
      id: createTempId(),
      tempId: createTempId(),
      signerId: activeSignerId,
      type,
      page,
      x,
      y,
      width: 0.25,
      height: 0.08,
      required: true,
      value: null,
    };
    setLocalFields((prev) => [...prev, newField]);
  };

  const updateFieldPosition = (id: string, x: number, y: number) => {
    setLocalFields((prev) =>
      prev.map((field) => (field.id === id ? { ...field, x, y } : field))
    );
  };

  const droppable = useDroppable({ id: 'pdf-canvas' });

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h2 className="text-lg font-semibold text-text">{tFields('title')}</h2>
        <p className="text-sm text-muted">{tFields('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="space-y-4 p-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text">{tFields('activeSigner')}</label>
            <Select
              value={activeSignerId}
              onChange={(event) => setActiveSignerId(event.target.value)}
            >
              {(signersQuery.data ?? []).map((signer) => (
                <option key={signer.id} value={signer.id}>
                  {signer.name}
                </option>
              ))}
            </Select>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              {tFields('paletteTitle')}
            </p>
            <div className="flex flex-col gap-2">
              {fieldTypes.map((type) => (
                <PaletteItem key={type} id={`palette-${type}`} label={tFields(`type.${type}`)} />
              ))}
            </div>
          </div>
        </Card>
        <Card className="p-3">
          <DndContext
            onDragEnd={(event) => {
              const overId = event.over?.id?.toString() ?? '';
              if (overId !== 'pdf-canvas') return;
              const rect = containerRef.current?.getBoundingClientRect();
              if (!rect) return;
              const pointer = event.activatorEvent as PointerEvent;
              const x = clamp((pointer.clientX - rect.left) / rect.width);
              const y = clamp((pointer.clientY - rect.top) / rect.height);
              const activeId = event.active.id.toString();
              if (activeId.startsWith('palette-')) {
                const type = activeId.replace('palette-', '') as SignatureFieldType;
                handleDrop(type, x, y);
              } else if (activeId.startsWith('field-')) {
                const fieldId = activeId.replace('field-', '');
                updateFieldPosition(fieldId, x, y);
              }
            }}
          >
            <div
              ref={(node) => {
                containerRef.current = node;
                droppable.setNodeRef(node);
              }}
              className="relative overflow-hidden rounded-lg border border-border bg-background"
            >
              {fileUrl ? <PdfViewer fileUrl={fileUrl} /> : null}
              <div className="absolute inset-0">
                {localFields.map((field) => (
                  <FieldItem
                    key={field.tempId}
                    field={field}
                    label={tFields(`type.${field.type}`)}
                  />
                ))}
              </div>
            </div>
          </DndContext>
        </Card>
      </div>
      <div className="flex items-center justify-between">
        <Button type="button" variant="ghost" onClick={onBack}>
          {tWizard('back')}
        </Button>
        <Button type="button" onClick={handleSave} disabled={batchUpdate.isPending}>
          {tWizard('next')}
        </Button>
      </div>
    </div>
  );
}

type PaletteItemProps = {
  readonly id: string;
  readonly label: string;
};

function PaletteItem({ id, label }: Readonly<PaletteItemProps>) {
  const draggable = useDraggable({ id });
  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className="cursor-grab rounded-md border border-border bg-surface px-3 py-2 text-sm text-text"
    >
      {label}
    </div>
  );
}

type FieldItemProps = {
  readonly field: LocalField;
  readonly label: string;
};

function FieldItem({ field, label }: Readonly<FieldItemProps>) {
  const draggable = useDraggable({ id: `field-${field.id}` });
  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className="absolute rounded-md border border-accent bg-accent/20 px-2 py-1 text-[10px] text-text"
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
      }}
    >
      {label}
    </div>
  );
}

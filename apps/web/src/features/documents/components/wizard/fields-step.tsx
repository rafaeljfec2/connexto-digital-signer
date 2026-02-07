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
import { Button, Card } from '@/shared/ui';
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
        <h2 className="text-lg font-semibold text-text">{tFields('title')}</h2>
        <p className="text-sm text-muted">{tFields('subtitle')}</p>
      </div>
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[260px_1fr]">
        <Card className="space-y-4 p-4">
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
        <Card className="p-3">
          <DndContext onDragEnd={handleDragEnd}>
            {fileUrl ? (
              <PdfViewer
                fileUrl={fileUrl}
                fields={fields}
                signerColors={signerColors}
                getFieldLabel={(type) => tFields(`type.${type}`)}
                onRemoveField={removeField}
                onPageContainerReady={handlePageReady}
              />
            ) : null}
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

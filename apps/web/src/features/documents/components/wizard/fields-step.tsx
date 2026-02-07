"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PenTool, Fingerprint } from 'lucide-react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import {
  useBatchUpdateFields,
  useDocumentFile,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Card, Select } from '@/shared/ui';
import type { SignatureFieldInput } from '@/features/documents/api';
import {
  PdfViewer,
  SignatureFieldType,
  usePdfFields,
} from '@/features/pdf-signature';

type PositionFieldType = 'signature' | 'initials';

const POSITION_TYPES: readonly { readonly type: PositionFieldType; readonly icon: React.ReactNode }[] = [
  { type: 'signature', icon: <PenTool className="h-4 w-4" /> },
  { type: 'initials', icon: <Fingerprint className="h-4 w-4" /> },
];

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
  const [activeFieldType, setActiveFieldType] = useState<SignatureFieldType>('signature');
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

  const handleAddFieldToPage = useCallback(
    (pageNumber: number, x: number, y: number) => {
      if (!activeSignerId) return;
      const width = 0.25;
      const height = 0.08;
      addField({
        id: createTempId(),
        signerId: activeSignerId,
        type: activeFieldType,
        page: pageNumber,
        x: clamp(x, 0, 1 - width),
        y: clamp(y, 0, 1 - height),
        width,
        height,
        required: true,
        value: null,
      });
    },
    [activeSignerId, activeFieldType, addField]
  );

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
    [fields, moveField]
  );

  return (
    <div className="space-y-4">
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-[260px_1fr]">
      <Card variant="glass" className="space-y-6 p-4">
        <div className="space-y-2">
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-100/70">
            {tFields('signersLabel')}
          </label>
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
          <label className="text-xs font-semibold uppercase tracking-wide text-neutral-100/70">
            {tFields('positionLabel')}
          </label>
          <div className="flex flex-col gap-2">
            {POSITION_TYPES.map(({ type, icon }) => (
              <button
                key={type}
                type="button"
                onClick={() => setActiveFieldType(type)}
                className={`flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition ${
                  activeFieldType === type
                    ? 'border-accent-400/50 bg-accent-600/20 text-accent-400'
                    : 'border-white/15 bg-white/5 text-neutral-100/60 hover:bg-white/10 hover:text-white'
                }`}
              >
                {icon}
                {tFields(`type.${type}`)}
              </button>
            ))}
          </div>
        </div>
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
              onPageClick={handleAddFieldToPage}
            />
          ) : null}
        </DndContext>
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

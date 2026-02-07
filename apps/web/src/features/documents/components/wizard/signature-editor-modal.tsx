"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { PenTool, Fingerprint, ChevronLeft } from 'lucide-react';
import type { DragEndEvent } from '@dnd-kit/core';
import { DndContext } from '@dnd-kit/core';
import {
  useBatchUpdateFields,
  useDocumentFile,
  useSignatureFields,
  useSigners,
} from '@/features/documents/hooks/use-document-wizard';
import { Button, Select } from '@/shared/ui';
import type { SignatureFieldInput } from '@/features/documents/api';
import {
  PdfViewer,
  SignatureFieldType,
  usePdfFields,
} from '@/features/pdf-signature';
import type { FieldPreview } from '@/features/pdf-signature';

type PositionFieldType = 'signature' | 'initials';

const POSITION_TYPES: readonly { readonly type: PositionFieldType; readonly icon: React.ReactNode }[] = [
  { type: 'signature', icon: <PenTool className="h-4 w-4" /> },
  { type: 'initials', icon: <Fingerprint className="h-4 w-4" /> },
];

const createTempId = () => `temp-${Math.random().toString(36).slice(2, 10)}`;

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

export type SignatureEditorModalProps = Readonly<{
  documentId: string;
  onClose: () => void;
  onSave: () => void;
}>;

export function SignatureEditorModal({ documentId, onClose, onSave }: SignatureEditorModalProps) {
  const tFields = useTranslations('fields');
  const tWizard = useTranslations('wizard');
  const signersQuery = useSigners(documentId);
  const fieldsQuery = useSignatureFields(documentId);
  const batchUpdate = useBatchUpdateFields(documentId);
  const fileQuery = useDocumentFile(documentId);
  const [activeSignerId, setActiveSignerId] = useState<string>('');
  const [activeFieldType, setActiveFieldType] = useState<SignatureFieldType>('signature');
  const pageRefs = useRef<Map<number, HTMLDivElement | null>>(new Map());
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const initialFields = useMemo(() => fieldsQuery.data ?? undefined, [fieldsQuery.data]);
  const { fields, addField, moveField, removeField } = usePdfFields({ initialFields });

  useEffect(() => {
    if (signersQuery.data && signersQuery.data.length > 0 && !activeSignerId) {
      setActiveSignerId(signersQuery.data[0].id);
    }
  }, [signersQuery.data, activeSignerId]);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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

  const signerNamesMap = useMemo(() => {
    return (signersQuery.data ?? []).reduce<Record<string, string>>((acc, signer) => {
      acc[signer.id] = signer.name;
      return acc;
    }, {});
  }, [signersQuery.data]);

  const getSignerName = useCallback(
    (signerId: string) => signerNamesMap[signerId] ?? '',
    [signerNamesMap]
  );

  const fieldPreview = useMemo<FieldPreview | undefined>(() => {
    if (!activeSignerId) return undefined;
    return {
      type: activeFieldType,
      label: tFields(`type.${activeFieldType}`),
      signerName: signerNamesMap[activeSignerId] ?? '',
      color: signerColors[activeSignerId] ?? '#4F46E5',
      width: 0.25,
      height: 0.08,
    };
  }, [activeFieldType, activeSignerId, signerNamesMap, signerColors, tFields]);

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
    onSave();
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
        x: clamp(x - width / 2, 0, 1 - width),
        y: clamp(y - height / 2, 0, 1 - height),
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
      if (!overId?.startsWith('page-')) return;
      const pageNumber = Number(overId.replace('page-', ''));
      const container = pageRefs.current.get(pageNumber);
      if (!container) return;
      const activeId = event.active.id.toString();

      if (activeId.startsWith('field-')) {
        const fieldId = activeId.replace('field-', '');
        const current = fields.find((fieldItem) => fieldItem.id === fieldId);
        if (!current) return;
        const rect = container.getBoundingClientRect();
        const deltaXRel = event.delta.x / rect.width;
        const deltaYRel = event.delta.y / rect.height;
        const x = clamp(current.x + deltaXRel, 0, 1 - current.width);
        const y = clamp(current.y + deltaYRel, 0, 1 - current.height);
        moveField({ id: fieldId, x, y, page: pageNumber });
      }
    },
    [fields, moveField]
  );

  return (
    <div className="fixed inset-0 z-50 flex bg-brand-900/95 backdrop-blur-sm">
      <div
        className={`absolute inset-y-0 left-0 z-10 flex w-64 flex-col border-r border-white/10 bg-brand-900/80 backdrop-blur-md transition-transform duration-200 xl:relative xl:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full xl:translate-x-0'
        }`}
      >
        <div className="flex-1 space-y-6 overflow-y-auto p-4">
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

          <p className="text-xs text-neutral-100/40">
            {tFields('clickToAdd')}
          </p>
        </div>

        <div className="flex flex-col gap-2 border-t border-white/10 p-4">
          <Button type="button" onClick={handleSave} isLoading={batchUpdate.isPending}>
            {tFields('saveAndContinue')}
          </Button>
          <Button type="button" variant="ghost" onClick={onClose}>
            <ChevronLeft className="mr-1 h-4 w-4" />
            {tWizard('back')}
          </Button>
        </div>
      </div>

      {sidebarOpen ? (
        // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-static-element-interactions
        <div
          className="fixed inset-0 z-[5] bg-black/40 xl:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex shrink-0 items-center gap-2 border-b border-white/10 px-3 py-2 xl:hidden">
          <Button
            type="button"
            variant="ghost"
            onClick={() => setSidebarOpen(true)}
            className="h-8 w-8 p-0"
          >
            <PenTool className="h-4 w-4" />
          </Button>
          <span className="text-xs text-neutral-100/60">
            {tFields('title')}
          </span>
        </div>

        <div className="min-h-0 flex-1 overflow-hidden">
          <DndContext onDragEnd={handleDragEnd}>
            {fileUrl ? (
              <PdfViewer
                fileUrl={fileUrl}
                fields={fields}
                signerColors={signerColors}
                getFieldLabel={(type) => tFields(`type.${type}`)}
                getSignerName={getSignerName}
                onRemoveField={removeField}
                onPageContainerReady={handlePageReady}
                onPageClick={handleAddFieldToPage}
                fieldPreview={fieldPreview}
                fillContainer
              />
            ) : null}
          </DndContext>
        </div>
      </div>
    </div>
  );
}

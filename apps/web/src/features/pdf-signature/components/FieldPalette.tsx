import { useDraggable } from '@dnd-kit/core';

import { Select } from '@/shared/ui';

import { SignatureFieldType } from '../types';

type SignerOption = Readonly<{
  id: string;
  name: string;
}>;

type FieldPaletteProps = Readonly<{
  signers: SignerOption[];
  activeSignerId: string;
  onSignerChange: (value: string) => void;
  fieldTypes: SignatureFieldType[];
  getFieldLabel: (type: SignatureFieldType) => string;
  signerColors: Record<string, string>;
  activeSignerLabel: string;
  paletteTitle: string;
  colorHint: string;
}>;

export const FieldPalette = ({
  signers,
  activeSignerId,
  onSignerChange,
  fieldTypes,
  getFieldLabel,
  signerColors,
  activeSignerLabel,
  paletteTitle,
  colorHint,
}: FieldPaletteProps) => (
  <div className="space-y-4">
    <div className="space-y-2">
      <label className="text-sm font-medium text-text">{activeSignerLabel}</label>
      <Select value={activeSignerId} onChange={(event) => onSignerChange(event.target.value)}>
        {signers.map((signer) => (
          <option key={signer.id} value={signer.id}>
            {signer.name}
          </option>
        ))}
      </Select>
      {activeSignerId ? (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span
            className="h-2 w-2 rounded-full"
            style={{ backgroundColor: signerColors[activeSignerId] ?? '#4F46E5' }}
          />
          <span>{colorHint}</span>
        </div>
      ) : null}
    </div>
    <div className="space-y-2">
      <p className="text-xs font-normal uppercase tracking-wide text-muted">{paletteTitle}</p>
      <div className="flex flex-col gap-2">
        {fieldTypes.map((type) => (
          <PaletteItem key={type} id={`palette-${type}`} label={getFieldLabel(type)} />
        ))}
      </div>
    </div>
  </div>
);

type PaletteItemProps = Readonly<{
  id: string;
  label: string;
}>;

const PaletteItem = ({ id, label }: PaletteItemProps) => {
  const draggable = useDraggable({ id, data: { type: 'palette', fieldType: id } });
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
};

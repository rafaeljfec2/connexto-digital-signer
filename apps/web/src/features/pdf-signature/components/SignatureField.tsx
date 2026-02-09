import { PenTool, Fingerprint, X } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

import { SignatureFieldData, SignatureFieldType } from '../types';

const FIELD_ICON: Record<SignatureFieldType, React.ReactNode> = {
  signature: <PenTool className="h-3 w-3 shrink-0" />,
  initials: <Fingerprint className="h-3 w-3 shrink-0" />,
  name: <PenTool className="h-3 w-3 shrink-0" />,
  date: <PenTool className="h-3 w-3 shrink-0" />,
  text: <PenTool className="h-3 w-3 shrink-0" />,
};

type SignatureFieldProps = Readonly<{
  field: SignatureFieldData;
  label: string;
  signerName?: string;
  color: string;
  onRemove?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}>;

export const SignatureField = ({
  field,
  label,
  signerName = '',
  color,
  onRemove,
  onSelect,
  isSelected = false,
}: SignatureFieldProps) => {
  const draggable = useDraggable({
    id: `field-${field.id}`,
    data: { id: field.id, page: field.page, type: 'field' },
  });

  return (
    <button
      type="button"
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      onClick={(event) => {
        event.stopPropagation();
        onSelect?.(field.id);
      }}
      className={`absolute flex flex-col items-center justify-center rounded-md border-2 border-dashed bg-white/80 px-2 py-0.5 text-xs shadow-sm transition-shadow ${
        isSelected ? 'ring-2 ring-primary/70 shadow-md' : 'hover:shadow-md'
      }`}
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
        borderColor: color,
        color,
        touchAction: 'none',
        cursor: 'grab',
      }}
    >
      <div className="flex w-full items-center justify-center gap-1">
        {FIELD_ICON[field.type]}
        <span className="truncate font-medium">{label}</span>
      </div>
      {signerName ? (
        <span className="max-w-full truncate text-[9px] leading-tight opacity-70">
          {signerName}
        </span>
      ) : null}
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            onRemove(field.id);
          }}
          onPointerDown={(event) => {
            event.stopPropagation();
          }}
          className="absolute -right-1.5 -top-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-neutral-200 text-neutral-600 shadow-sm transition hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-2.5 w-2.5" />
        </button>
      ) : null}
    </button>
  );
};

import { PenTool, Fingerprint, X } from 'lucide-react';
import { useDraggable } from '@dnd-kit/core';

import { SignatureFieldData, SignatureFieldType } from '../types';

const FIELD_ICON: Record<SignatureFieldType, React.ReactNode> = {
  signature: <PenTool className="h-3.5 w-3.5 shrink-0" />,
  initials: <Fingerprint className="h-3.5 w-3.5 shrink-0" />,
  name: <PenTool className="h-3.5 w-3.5 shrink-0" />,
  date: <PenTool className="h-3.5 w-3.5 shrink-0" />,
  text: <PenTool className="h-3.5 w-3.5 shrink-0" />,
};

type SignatureFieldProps = Readonly<{
  field: SignatureFieldData;
  label: string;
  color: string;
  onRemove?: (id: string) => void;
  onSelect?: (id: string) => void;
  isSelected?: boolean;
}>;

export const SignatureField = ({
  field,
  label,
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
      className={`absolute flex items-center justify-center gap-1.5 rounded-md border-2 border-dashed bg-white/80 px-3 py-1 text-xs font-medium shadow-sm transition-shadow ${
        isSelected ? 'ring-2 ring-accent-400/70 shadow-md' : 'hover:shadow-md'
      }`}
      style={{
        left: `${field.x * 100}%`,
        top: `${field.y * 100}%`,
        width: `${field.width * 100}%`,
        height: `${field.height * 100}%`,
        borderColor: color,
        color,
        touchAction: 'none',
      }}
    >
      {FIELD_ICON[field.type]}
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onRemove(field.id);
          }}
          className="ml-auto flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-neutral-200/80 text-neutral-600 transition hover:bg-red-100 hover:text-red-600"
        >
          <X className="h-3 w-3" />
        </button>
      ) : null}
    </button>
  );
};

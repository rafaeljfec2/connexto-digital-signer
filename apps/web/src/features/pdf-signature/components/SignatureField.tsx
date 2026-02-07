import { useDraggable } from '@dnd-kit/core';

import { SignatureFieldData } from '../types';

type SignatureFieldProps = Readonly<{
  field: SignatureFieldData;
  label: string;
  color: string;
  onRemove?: (id: string) => void;
}>;

export const SignatureField = ({ field, label, color, onRemove }: SignatureFieldProps) => {
  const draggable = useDraggable({
    id: `field-${field.id}`,
    data: { id: field.id, page: field.page, type: 'field' },
  });

  return (
    <div
      ref={draggable.setNodeRef}
      {...draggable.listeners}
      {...draggable.attributes}
      className="absolute flex items-center justify-between gap-2 rounded-md border bg-white/90 px-2 py-1 text-[10px] text-text shadow-sm"
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
      <span className="truncate">{label}</span>
      {onRemove ? (
        <button
          type="button"
          onClick={() => onRemove(field.id)}
          className="text-[10px] font-semibold text-muted"
        >
          ×
        </button>
      ) : null}
    </div>
  );
};

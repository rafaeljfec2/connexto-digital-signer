'use client';

import { FileText } from 'lucide-react';

type DocumentTabItem = {
  readonly id: string;
  readonly title: string;
  readonly badge?: number;
};

type DocumentTabsProps = {
  readonly documents: readonly DocumentTabItem[];
  readonly selectedId: string;
  readonly onSelect: (id: string) => void;
  readonly size?: 'sm' | 'md';
};

export function DocumentTabs({
  documents,
  selectedId,
  onSelect,
  size = 'md',
}: DocumentTabsProps) {
  if (documents.length <= 1) return null;

  const isSmall = size === 'sm';

  return (
    <div className="flex gap-1 overflow-x-auto rounded-lg bg-th-hover p-1">
      {documents.map((doc) => {
        const isActive = doc.id === selectedId;
        return (
          <button
            key={doc.id}
            type="button"
            onClick={() => onSelect(doc.id)}
            className={[
              'flex shrink-0 items-center gap-1.5 rounded-md transition-all',
              isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs',
              isActive
                ? 'bg-white font-medium text-foreground shadow-sm dark:bg-white/10'
                : 'text-foreground-muted hover:text-foreground',
            ].join(' ')}
          >
            <FileText className={isSmall ? 'h-3 w-3 shrink-0' : 'h-3.5 w-3.5 shrink-0'} />
            <span className="max-w-[150px] truncate">{doc.title}</span>
            {doc.badge !== undefined && doc.badge > 0 ? (
              <span
                className={[
                  'inline-flex items-center justify-center rounded-full bg-primary/10 font-medium text-primary',
                  isSmall ? 'h-4 min-w-[16px] px-1 text-[9px]' : 'h-5 min-w-[20px] px-1.5 text-[10px]',
                ].join(' ')}
              >
                {doc.badge}
              </span>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

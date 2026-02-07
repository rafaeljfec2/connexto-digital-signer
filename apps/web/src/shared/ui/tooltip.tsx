import type { ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom';

export type TooltipProps = {
  readonly content: string;
  readonly position?: TooltipPosition;
  readonly children: ReactNode;
};

const positionClass: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
};

export function Tooltip({
  content,
  position = 'top',
  children,
}: Readonly<TooltipProps>) {
  return (
    <span className="relative inline-flex group">
      {children}
      <span
        className={`pointer-events-none absolute z-20 whitespace-nowrap rounded-md bg-brand-900 px-2 py-1 text-[11px] font-semibold text-white opacity-0 transition-opacity group-hover:opacity-100 ${positionClass[position]}`}
      >
        {content}
      </span>
    </span>
  );
}

import type { ReactNode } from 'react';

type TooltipPosition = 'top' | 'bottom' | 'left' | 'right';

export type TooltipProps = {
  readonly content: string;
  readonly position?: TooltipPosition;
  readonly maxWidth?: number;
  readonly fullWidth?: boolean;
  readonly children: ReactNode;
};

const positionClass: Record<TooltipPosition, string> = {
  top: 'bottom-full left-1/2 mb-2 -translate-x-1/2',
  bottom: 'top-full left-1/2 mt-2 -translate-x-1/2',
  left: 'right-full top-1/2 mr-2 -translate-y-1/2',
  right: 'left-full top-1/2 ml-2 -translate-y-1/2',
};

export function Tooltip({
  content,
  position = 'top',
  maxWidth = 260,
  fullWidth = false,
  children,
}: Readonly<TooltipProps>) {
  return (
    <span className={`group/tip relative ${fullWidth ? 'flex w-full' : 'inline-flex'}`}>
      {children}
      <span
        className={`pointer-events-none absolute z-50 w-max rounded-md border border-th-border bg-th-dialog px-2.5 py-1.5 text-[11px] font-medium leading-relaxed text-foreground opacity-0 shadow-lg transition-opacity group-hover/tip:opacity-100 ${positionClass[position]}`}
        style={{ maxWidth: `${String(maxWidth)}px` }}
      >
        {content}
      </span>
    </span>
  );
}

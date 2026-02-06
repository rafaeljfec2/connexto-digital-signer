import type { HTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from 'react';

export type TableProps = HTMLAttributes<HTMLTableElement>;
export type TableHeaderProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableBodyProps = HTMLAttributes<HTMLTableSectionElement>;
export type TableRowProps = HTMLAttributes<HTMLTableRowElement>;
export type TableHeadProps = ThHTMLAttributes<HTMLTableCellElement>;
export type TableCellProps = TdHTMLAttributes<HTMLTableCellElement>;

export function Table({ className = '', ...props }: Readonly<TableProps>) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={`w-full text-left text-sm ${className}`} {...props} />
    </div>
  );
}

export function TableHeader({
  className = '',
  ...props
}: Readonly<TableHeaderProps>) {
  return <thead className={`border-b border-border ${className}`} {...props} />;
}

export function TableBody({ className = '', ...props }: Readonly<TableBodyProps>) {
  return <tbody className={className} {...props} />;
}

export function TableRow({ className = '', ...props }: Readonly<TableRowProps>) {
  return <tr className={`border-b border-border ${className}`} {...props} />;
}

export function TableHead({ className = '', ...props }: Readonly<TableHeadProps>) {
  const base = 'px-3 py-2 text-xs font-semibold uppercase tracking-wide text-muted';
  return <th className={`${base} ${className}`} {...props} />;
}

export function TableCell({ className = '', ...props }: Readonly<TableCellProps>) {
  return <td className={`px-3 py-3 ${className}`} {...props} />;
}

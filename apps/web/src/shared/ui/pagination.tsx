import { Button } from './button';

export type PaginationProps = {
  readonly page: number;
  readonly totalPages: number;
  readonly onPageChange: (page: number) => void;
  readonly previousLabel?: string;
  readonly nextLabel?: string;
  readonly pageLabel?: string;
};

export function Pagination({
  page,
  totalPages,
  onPageChange,
  previousLabel = 'Previous',
  nextLabel = 'Next',
  pageLabel = 'Page',
}: Readonly<PaginationProps>) {
  const canPrev = page > 1;
  const canNext = page < totalPages;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 text-sm text-neutral-100/80">
      <Button type="button" variant="ghost" onClick={() => onPageChange(page - 1)} disabled={!canPrev}>
        {previousLabel}
      </Button>
      <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs">
        {pageLabel} {page} / {totalPages}
      </span>
      <Button type="button" variant="ghost" onClick={() => onPageChange(page + 1)} disabled={!canNext}>
        {nextLabel}
      </Button>
    </div>
  );
}

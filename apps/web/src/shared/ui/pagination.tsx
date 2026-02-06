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
    <div className="flex items-center justify-between gap-3 text-sm">
      <button
        type="button"
        className="rounded-md border border-border px-3 py-2 text-text disabled:opacity-50"
        onClick={() => onPageChange(page - 1)}
        disabled={!canPrev}
      >
        {previousLabel}
      </button>
      <span className="text-muted">
        {pageLabel} {page} / {totalPages}
      </span>
      <button
        type="button"
        className="rounded-md border border-border px-3 py-2 text-text disabled:opacity-50"
        onClick={() => onPageChange(page + 1)}
        disabled={!canNext}
      >
        {nextLabel}
      </button>
    </div>
  );
}

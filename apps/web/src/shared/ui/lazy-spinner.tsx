type LazySpinnerProps = Readonly<{
  minHeight?: string;
}>;

export function LazySpinner({ minHeight = '60vh' }: LazySpinnerProps) {
  return (
    <div className="flex items-center justify-center" style={{ minHeight }}>
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
    </div>
  );
}

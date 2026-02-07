import { Card, Skeleton } from '@/shared/ui';

export type KpiItem = {
  readonly label: string;
  readonly value: number;
};

export type KpiCardsProps = {
  readonly items: KpiItem[];
  readonly isLoading?: boolean;
};

export function KpiCards({ items, isLoading = false }: Readonly<KpiCardsProps>) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item) => (
        <Card key={item.label} variant="glass" className="p-4">
          <p className="text-xs uppercase tracking-wide text-neutral-100/70">{item.label}</p>
          {isLoading ? (
            <Skeleton className="mt-3 h-8 w-24" />
          ) : (
            <p className="mt-3 text-2xl font-semibold text-white">{item.value}</p>
          )}
        </Card>
      ))}
    </div>
  );
}

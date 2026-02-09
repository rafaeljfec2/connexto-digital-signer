import type { ComponentType } from 'react';
import dynamic from 'next/dynamic';
import { LazySpinner } from '@/shared/ui/lazy-spinner';

type LazyLoadOptions = Readonly<{
  minHeight?: string;
}>;

export function lazyLoad<P extends object>(
  importFn: () => Promise<{ [key: string]: ComponentType<P> }>,
  exportName: string,
  options: LazyLoadOptions = {},
) {
  const { minHeight = '60vh' } = options;

  return dynamic<P>(
    () => importFn().then((mod) => mod[exportName]),
    {
      ssr: false,
      loading: () => <LazySpinner minHeight={minHeight} />,
    },
  );
}

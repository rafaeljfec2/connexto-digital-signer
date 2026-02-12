"use client";

import { lazy, Suspense, useState, useEffect, type ComponentType } from 'react';
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

  const LazyComponent = lazy(() =>
    importFn().then((mod) => ({ default: mod[exportName] })),
  );

  function LazyLoadWrapper(props: P) {
    const [isMounted, setIsMounted] = useState(false);

    useEffect(() => {
      setIsMounted(true);
    }, []);

    if (!isMounted) {
      return <LazySpinner minHeight={minHeight} />;
    }

    return (
      <Suspense fallback={<LazySpinner minHeight={minHeight} />}>
        <LazyComponent {...props} />
      </Suspense>
    );
  }

  LazyLoadWrapper.displayName = `LazyLoad(${exportName})`;

  return LazyLoadWrapper;
}

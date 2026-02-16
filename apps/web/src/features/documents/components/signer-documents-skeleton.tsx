'use client';

import { Card } from '@/shared/ui';

const SKELETON_COUNT = 3;

export function SignerDocumentsSkeleton() {
  return (
    <div className="space-y-3">
      {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
        <Card key={`skeleton-${String(i)}`} variant="glass" className="animate-pulse p-4">
          <div className="flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-th-hover" />
            <div className="flex-1 space-y-2">
              <div className="h-4 w-48 rounded bg-th-hover" />
              <div className="h-3 w-32 rounded bg-th-hover" />
            </div>
            <div className="h-8 w-20 rounded-lg bg-th-hover" />
          </div>
        </Card>
      ))}
    </div>
  );
}

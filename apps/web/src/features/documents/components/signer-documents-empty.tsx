'use client';

import { Card } from '@/shared/ui';
import { Inbox } from 'lucide-react';

type SignerDocumentsEmptyProps = Readonly<{
  title: string;
  description: string;
}>;

export function SignerDocumentsEmpty({
  title,
  description,
}: SignerDocumentsEmptyProps) {
  return (
    <Card
      variant="glass"
      className="flex flex-col items-center justify-center p-12 text-center"
    >
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-th-hover">
        <Inbox className="h-7 w-7 text-foreground-subtle" />
      </div>
      <h3 className="mt-4 text-sm font-medium text-foreground">{title}</h3>
      <p className="mt-1 text-xs text-foreground-subtle">{description}</p>
    </Card>
  );
}

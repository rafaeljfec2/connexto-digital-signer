"use client";

import dynamic from 'next/dynamic';
import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import type { SignerField } from '@/features/signing/api';

const SignerPdfViewer = dynamic(
  () => import('../signer-pdf-viewer').then((mod) => mod.SignerPdfViewer),
  { ssr: false, loading: () => (
    <div className="flex min-h-[40vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-foreground-subtle border-t-foreground" />
    </div>
  )}
);

type ViewStepProps = Readonly<{
  fileUrl: string;
  fields: ReadonlyArray<SignerField>;
  labels: Readonly<{
    instruction: string;
    next: string;
    clickToSign: string;
    clickToInitials: string;
  }>;
  onNext: () => void;
}>;

export function ViewStep({ fileUrl, fields, labels, onNext }: ViewStepProps) {
  return (
    <div className="flex min-h-0 flex-1 flex-col pb-16">
      <p className="mb-1 text-center text-[10px] text-foreground-subtle md:text-xs">
        {labels.instruction}
      </p>

      <Card
        variant="glass"
        className="flex min-h-0 flex-1 flex-col overflow-hidden p-0"
      >
        {fileUrl ? (
          <SignerPdfViewer
            fileUrl={fileUrl}
            fields={fields as SignerField[]}
            fieldValues={{}}
            onFieldClick={() => undefined}
            disabled
            labels={{
              clickToSign: labels.clickToSign,
              clickToInitials: labels.clickToInitials,
            }}
          />
        ) : null}
      </Card>

      <div className="fixed bottom-0 left-0 right-0 z-30 flex justify-end border-t border-th-border bg-th-card/95 px-4 py-3 backdrop-blur-sm">
        <Button
          type="button"
          onClick={onNext}
        >
          {labels.next}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

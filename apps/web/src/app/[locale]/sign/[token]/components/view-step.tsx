"use client";

import { ArrowRight } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { SignerPdfViewer } from '../signer-pdf-viewer';
import type { SignerField } from '@/features/signing/api';

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
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="mb-1 text-center text-[10px] text-neutral-100/50 md:text-xs">
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

      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-white/10 bg-brand-900/95 px-4 py-3 backdrop-blur-sm md:static md:mt-3 md:border-0 md:bg-transparent md:p-0 md:backdrop-blur-none">
        <Button
          type="button"
          onClick={onNext}
          className="w-full md:ml-auto md:w-auto"
        >
          {labels.next}
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

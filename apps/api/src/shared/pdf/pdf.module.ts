import { Global, Logger, Module } from '@nestjs/common';
import { PdfService } from './pdf.service';

@Global()
@Module({
  providers: [
    PdfService,
    {
      provide: Logger,
      useValue: new Logger(PdfService.name),
    },
  ],
  exports: [PdfService],
})
export class PdfModule {}

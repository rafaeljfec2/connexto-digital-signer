import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { sha256 } from '@connexto/shared';

export interface SignerEvidence {
  name: string;
  email: string;
  signedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

export interface EmbedFieldData {
  readonly type: string;
  readonly page: number;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly value: string | null;
}

@Injectable()
export class PdfService {
  private readonly logger = new Logger(PdfService.name);

  async embedSignatures(
    pdfBuffer: Buffer,
    fields: EmbedFieldData[]
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(pdfBuffer, {
      ignoreEncryption: true,
    });
    const pages = pdfDoc.getPages();
    const cursiveFont = await pdfDoc.embedFont(StandardFonts.Courier);

    const fieldsWithValues = fields.filter(
      (field) => field.value !== null && field.value.length > 0
    );

    for (const field of fieldsWithValues) {
      const pageIndex = field.page - 1;
      if (pageIndex < 0 || pageIndex >= pages.length) {
        this.logger.warn(
          `Skipping field on page ${field.page}: page does not exist`
        );
        continue;
      }

      const page = pages[pageIndex];
      const { width: pageWidth, height: pageHeight } = page.getSize();

      const fieldX = field.x * pageWidth;
      const fieldW = field.width * pageWidth;
      const fieldH = field.height * pageHeight;
      const fieldY = pageHeight - field.y * pageHeight - fieldH;

      const value = field.value as string;

      if (value.startsWith('data:image/')) {
        await this.embedImageField(pdfDoc, page, value, fieldX, fieldY, fieldW, fieldH);
      } else {
        this.embedTextField(page, cursiveFont, value, fieldX, fieldY, fieldW, fieldH);
      }
    }

    const result = await pdfDoc.save();
    return Buffer.from(result);
  }

  private async embedImageField(
    pdfDoc: PDFDocument,
    page: PDFPage,
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): Promise<void> {
    try {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return;

      const imageBytes = Buffer.from(base64Data, 'base64');

      let image;
      if (dataUrl.includes('image/png')) {
        image = await pdfDoc.embedPng(imageBytes);
      } else {
        image = await pdfDoc.embedJpg(imageBytes);
      }

      const imageDims = image.scaleToFit(width, height);

      const centeredX = x + (width - imageDims.width) / 2;
      const centeredY = y + (height - imageDims.height) / 2;

      page.drawImage(image, {
        x: centeredX,
        y: centeredY,
        width: imageDims.width,
        height: imageDims.height,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to embed image signature: ${message}`);
    }
  }

  private embedTextField(
    page: PDFPage,
    font: Awaited<ReturnType<PDFDocument['embedFont']>>,
    text: string,
    x: number,
    y: number,
    width: number,
    height: number
  ): void {
    const maxFontSize = 16;
    const minFontSize = 8;
    let fontSize = maxFontSize;

    while (fontSize > minFontSize) {
      const textWidth = font.widthOfTextAtSize(text, fontSize);
      if (textWidth <= width * 0.9) break;
      fontSize -= 1;
    }

    const textWidth = font.widthOfTextAtSize(text, fontSize);
    const textHeight = font.heightAtSize(fontSize);
    const centeredX = x + (width - textWidth) / 2;
    const centeredY = y + (height - textHeight) / 2;

    page.drawText(text, {
      x: centeredX,
      y: centeredY,
      size: fontSize,
      font,
      color: rgb(0.1, 0.1, 0.3),
    });
  }

  async appendEvidencePage(
    originalPdfBuffer: Buffer,
    signers: SignerEvidence[],
    documentTitle: string
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer, {
      ignoreEncryption: true,
    });
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontSize = 10;
    const lineHeight = 14;
    const margin = 50;
    const pageWidth = 595;
    const pageHeight = 842;
    const evidencePage = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    evidencePage.drawText('Signature Evidence', {
      x: margin,
      y,
      size: 16,
      font,
      color: rgb(0, 0, 0),
    });
    y -= lineHeight * 2;

    evidencePage.drawText(`Document: ${documentTitle}`, {
      x: margin,
      y,
      size: fontSize,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
    y -= lineHeight;

    evidencePage.drawText(
      `Generated at: ${new Date().toISOString()} UTC`,
      {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      }
    );
    y -= lineHeight * 2;

    for (const signer of signers) {
      evidencePage.drawText(`Signer: ${signer.name} (${signer.email})`, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0, 0, 0),
      });
      y -= lineHeight;
      evidencePage.drawText(`Signed at: ${signer.signedAt}`, {
        x: margin,
        y,
        size: fontSize,
        font,
        color: rgb(0.2, 0.2, 0.2),
      });
      y -= lineHeight;
      if (signer.ipAddress) {
        evidencePage.drawText(`IP: ${signer.ipAddress}`, {
          x: margin,
          y,
          size: fontSize - 2,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= lineHeight;
      }
      if (signer.userAgent) {
        const ua = signer.userAgent.length > 80
          ? signer.userAgent.slice(0, 77) + '...'
          : signer.userAgent;
        evidencePage.drawText(`User-Agent: ${ua}`, {
          x: margin,
          y,
          size: fontSize - 2,
          font,
          color: rgb(0.3, 0.3, 0.3),
        });
        y -= lineHeight;
      }
      y -= lineHeight;
      if (y < margin + lineHeight * 2) {
        pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
    }

    const finalPdfBytes = await pdfDoc.save();
    return Buffer.from(finalPdfBytes);
  }

  computeHash(buffer: Buffer): string {
    return sha256(buffer);
  }
}

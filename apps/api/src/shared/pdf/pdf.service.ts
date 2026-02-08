import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';
import { sha256 } from '@connexto/shared';

export interface SignerEvidence {
  name: string;
  email: string;
  signedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
  signatureData: string | null;
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
    const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const PAGE_WIDTH = 595;
    const PAGE_HEIGHT = 842;
    const MARGIN = 50;
    const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

    const colors = {
      primary: rgb(0.055, 0.227, 0.431),
      secondary: rgb(0.3, 0.3, 0.4),
      muted: rgb(0.45, 0.45, 0.55),
      accent: rgb(0.133, 0.545, 0.133),
      border: rgb(0.82, 0.84, 0.87),
      headerBg: rgb(0.945, 0.953, 0.965),
      cardBg: rgb(0.973, 0.976, 0.984),
      white: rgb(1, 1, 1),
    };

    let currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
    let y = PAGE_HEIGHT - MARGIN;

    const ensureSpace = (needed: number): void => {
      if (y - needed < MARGIN) {
        currentPage = pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]);
        y = PAGE_HEIGHT - MARGIN;
      }
    };

    const drawHorizontalLine = (yPos: number, width = CONTENT_WIDTH): void => {
      currentPage.drawLine({
        start: { x: MARGIN, y: yPos },
        end: { x: MARGIN + width, y: yPos },
        thickness: 0.5,
        color: colors.border,
      });
    };

    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 60,
      width: CONTENT_WIDTH,
      height: 70,
      color: colors.primary,
      borderWidth: 0,
    });

    currentPage.drawText('SIGNATURE EVIDENCE', {
      x: MARGIN + 20,
      y: y - 28,
      size: 18,
      font: fontBold,
      color: colors.white,
    });

    currentPage.drawText('Digital signature certificate', {
      x: MARGIN + 20,
      y: y - 48,
      size: 9,
      font: fontRegular,
      color: rgb(0.7, 0.8, 0.95),
    });

    y -= 85;

    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 50,
      width: CONTENT_WIDTH,
      height: 55,
      color: colors.headerBg,
      borderWidth: 0,
    });

    currentPage.drawRectangle({
      x: MARGIN,
      y: y - 50,
      width: CONTENT_WIDTH,
      height: 55,
      borderColor: colors.border,
      borderWidth: 0.5,
      color: colors.headerBg,
    });

    currentPage.drawText('DOCUMENT', {
      x: MARGIN + 12,
      y: y - 14,
      size: 7,
      font: fontBold,
      color: colors.muted,
    });

    const titleText = documentTitle.length > 60
      ? `${documentTitle.slice(0, 57)}...`
      : documentTitle;

    currentPage.drawText(titleText, {
      x: MARGIN + 12,
      y: y - 28,
      size: 11,
      font: fontBold,
      color: colors.primary,
    });

    const generatedAt = new Date().toISOString().replace('T', ' ').replace('Z', ' UTC');
    currentPage.drawText(`Generated: ${generatedAt}`, {
      x: MARGIN + 12,
      y: y - 43,
      size: 8,
      font: fontRegular,
      color: colors.muted,
    });

    y -= 70;

    currentPage.drawText(`SIGNERS (${signers.length})`, {
      x: MARGIN,
      y,
      size: 8,
      font: fontBold,
      color: colors.muted,
    });

    y -= 15;

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const cardHeight = this.calculateSignerCardHeight(signer);
      ensureSpace(cardHeight + 15);

      y = await this.drawSignerCard(pdfDoc, currentPage, {
        signer,
        index: i,
        y,
        margin: MARGIN,
        contentWidth: CONTENT_WIDTH,
        cardHeight,
        fonts: { bold: fontBold, regular: fontRegular },
        colors,
        drawLine: drawHorizontalLine,
      });
    }

    ensureSpace(40);
    y -= 10;
    drawHorizontalLine(y);
    y -= 18;

    currentPage.drawText(
      'This document was digitally signed using Connexto Digital Signer.',
      {
        x: MARGIN,
        y,
        size: 7.5,
        font: fontRegular,
        color: colors.muted,
      },
    );
    y -= 12;
    currentPage.drawText(
      'All signature evidence is cryptographically secured and can be independently verified.',
      {
        x: MARGIN,
        y,
        size: 7.5,
        font: fontRegular,
        color: colors.muted,
      },
    );

    const finalPdfBytes = await pdfDoc.save();
    return Buffer.from(finalPdfBytes);
  }

  private async drawSignerCard(
    pdfDoc: PDFDocument,
    page: PDFPage,
    ctx: {
      signer: SignerEvidence;
      index: number;
      y: number;
      margin: number;
      contentWidth: number;
      cardHeight: number;
      fonts: { bold: Awaited<ReturnType<PDFDocument['embedFont']>>; regular: Awaited<ReturnType<PDFDocument['embedFont']>> };
      colors: Record<string, ReturnType<typeof rgb>>;
      drawLine: (yPos: number) => void;
    },
  ): Promise<number> {
    const { signer, index, margin, contentWidth, cardHeight, fonts, colors } = ctx;
    let { y } = ctx;

    page.drawRectangle({
      x: margin, y: y - cardHeight, width: contentWidth, height: cardHeight,
      color: colors['cardBg'] ?? rgb(0.97, 0.98, 0.98),
      borderColor: colors['border'] ?? rgb(0.82, 0.84, 0.87),
      borderWidth: 0.5,
    });

    page.drawRectangle({
      x: margin, y: y - cardHeight, width: 3, height: cardHeight,
      color: colors['accent'] ?? rgb(0.13, 0.55, 0.13),
      borderWidth: 0,
    });

    const SIG_BOX_W = 120;
    const SIG_BOX_H = 50;

    if (signer.signatureData) {
      await this.embedSignatureInEvidence(
        pdfDoc, page, signer.signatureData,
        margin + contentWidth - SIG_BOX_W - 12,
        y - cardHeight + 8,
        SIG_BOX_W, SIG_BOX_H,
      );
    } else {
      page.drawText('● Signed', {
        x: margin + contentWidth - 60, y: y - 16, size: 8,
        font: fonts.bold,
        color: colors['accent'] ?? rgb(0.13, 0.55, 0.13),
      });
    }

    page.drawText(`${index + 1}.`, {
      x: margin + 14, y: y - 16, size: 10,
      font: fonts.bold,
      color: colors['primary'] ?? rgb(0.055, 0.227, 0.431),
    });

    const nameText = signer.name.length > 40
      ? `${signer.name.slice(0, 37)}...`
      : signer.name;

    page.drawText(nameText, {
      x: margin + 30, y: y - 16, size: 10,
      font: fonts.bold,
      color: colors['primary'] ?? rgb(0.055, 0.227, 0.431),
    });

    page.drawText(signer.email, {
      x: margin + 30, y: y - 30, size: 9,
      font: fonts.regular,
      color: colors['secondary'] ?? rgb(0.3, 0.3, 0.4),
    });

    let detailY = y - 48;
    ctx.drawLine(detailY + 6);

    detailY = this.drawDetailRow(page, fonts, {
      label: 'Signed at', value: signer.signedAt, x: margin + 14, y: detailY,
    });

    if (signer.ipAddress) {
      detailY = this.drawDetailRow(page, fonts, {
        label: 'IP Address', value: signer.ipAddress, x: margin + 14, y: detailY,
      });
    }

    if (signer.userAgent) {
      const maxLen = signer.signatureData ? 60 : 90;
      const ua = signer.userAgent.length > maxLen
        ? `${signer.userAgent.slice(0, maxLen - 3)}...`
        : signer.userAgent;
      this.drawDetailRow(page, fonts, {
        label: 'User-Agent', value: ua, x: margin + 14, y: detailY,
      });
    }

    return y - cardHeight - 10;
  }

  private calculateSignerCardHeight(signer: SignerEvidence): number {
    let height = 55;
    height += 16;
    if (signer.ipAddress) height += 14;
    if (signer.userAgent) height += 14;
    if (signer.signatureData) {
      height = Math.max(height, 70);
    }
    return height;
  }

  private async embedSignatureInEvidence(
    pdfDoc: PDFDocument,
    page: PDFPage,
    dataUrl: string,
    x: number,
    y: number,
    width: number,
    height: number,
  ): Promise<void> {
    try {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return;

      const imageBytes = Buffer.from(base64Data, 'base64');
      const image = dataUrl.includes('image/png')
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

      const borderColor = rgb(0.82, 0.84, 0.87);
      page.drawRectangle({
        x,
        y,
        width,
        height,
        borderColor,
        borderWidth: 0.5,
        color: rgb(1, 1, 1),
      });

      const padding = 4;
      const innerW = width - padding * 2;
      const innerH = height - padding * 2;
      const dims = image.scaleToFit(innerW, innerH);
      const centeredX = x + padding + (innerW - dims.width) / 2;
      const centeredY = y + padding + (innerH - dims.height) / 2;

      page.drawImage(image, {
        x: centeredX,
        y: centeredY,
        width: dims.width,
        height: dims.height,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to embed signature in evidence: ${message}`);
    }
  }

  private drawDetailRow(
    page: PDFPage,
    fonts: {
      bold: Awaited<ReturnType<PDFDocument['embedFont']>>;
      regular: Awaited<ReturnType<PDFDocument['embedFont']>>;
    },
    options: { label: string; value: string; x: number; y: number },
  ): number {
    const mutedColor = rgb(0.45, 0.45, 0.55);
    const secondaryColor = rgb(0.3, 0.3, 0.4);

    page.drawText(`${options.label}:`, {
      x: options.x,
      y: options.y,
      size: 8,
      font: fonts.bold,
      color: mutedColor,
    });

    const labelWidth = fonts.bold.widthOfTextAtSize(`${options.label}: `, 8);

    page.drawText(options.value, {
      x: options.x + labelWidth,
      y: options.y,
      size: 8,
      font: fonts.regular,
      color: secondaryColor,
    });

    return options.y - 14;
  }

  computeHash(buffer: Buffer): string {
    return sha256(buffer);
  }
}

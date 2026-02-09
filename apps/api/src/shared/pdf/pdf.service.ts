import { sha256 } from '@connexto/shared';
import { Injectable, Logger } from '@nestjs/common';
import { PDFDocument, PDFPage, rgb, StandardFonts } from 'pdf-lib';

type PdfFont = Awaited<ReturnType<PDFDocument['embedFont']>>;

interface ImageRect {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly padding?: number;
}

export interface SignerEvidence {
  readonly name: string;
  readonly email: string;
  readonly signedAt: string;
  readonly ipAddress: string | null;
  readonly userAgent: string | null;
  readonly signatureData: string | null;
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

interface EvidenceLabels {
  readonly title: string;
  readonly subtitle: string;
  readonly document: string;
  readonly generated: string;
  readonly signers: string;
  readonly signedAt: string;
  readonly ipAddress: string;
  readonly userAgent: string;
  readonly signed: string;
  readonly footer1: string;
  readonly footer2: string;
}

interface EvidenceColors {
  readonly primary: ReturnType<typeof rgb>;
  readonly secondary: ReturnType<typeof rgb>;
  readonly muted: ReturnType<typeof rgb>;
  readonly accent: ReturnType<typeof rgb>;
  readonly border: ReturnType<typeof rgb>;
  readonly headerBg: ReturnType<typeof rgb>;
  readonly cardBg: ReturnType<typeof rgb>;
  readonly white: ReturnType<typeof rgb>;
}

interface EvidencePageContext {
  readonly pdfDoc: PDFDocument;
  readonly fonts: { readonly bold: PdfFont; readonly regular: PdfFont };
  readonly colors: EvidenceColors;
  readonly labels: EvidenceLabels;
  readonly locale: string;
  readonly margin: number;
  readonly contentWidth: number;
  readonly pageWidth: number;
  readonly pageHeight: number;
  currentPage: PDFPage;
  y: number;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const SIG_BOX_W = 120;
const SIG_BOX_H = 50;
const MAX_TITLE_LENGTH = 60;
const MAX_NAME_LENGTH = 40;

const EVIDENCE_LABELS: Record<string, EvidenceLabels> = {
  en: {
    title: 'SIGNATURE EVIDENCE',
    subtitle: 'Digital signature certificate',
    document: 'DOCUMENT',
    generated: 'Generated',
    signers: 'SIGNERS',
    signedAt: 'Signed at',
    ipAddress: 'IP Address',
    userAgent: 'User-Agent',
    signed: 'Signed',
    footer1: 'This document was digitally signed using Connexto Digital Signer.',
    footer2:
      'All signature evidence is cryptographically secured and can be independently verified.',
  },
  'pt-br': {
    title: 'EVIDENCIA DE ASSINATURA',
    subtitle: 'Certificado de assinatura digital',
    document: 'DOCUMENTO',
    generated: 'Gerado em',
    signers: 'SIGNATÁRIOS',
    signedAt: 'Assinado em',
    ipAddress: 'Endereco IP',
    userAgent: 'Navegador',
    signed: 'Assinado',
    footer1: 'Este documento foi assinado digitalmente usando o Connexto Digital Signer.',
    footer2:
      'Todas as evidências de assinatura são criptograficamente protegidas e podem ser verificadas de forma independente.',
  },
};

function getEvidenceLabels(locale: string): EvidenceLabels {
  return EVIDENCE_LABELS[locale] ?? EVIDENCE_LABELS['en'];
}

function formatEvidenceDate(isoDate: string, locale: string): string {
  try {
    const date = new Date(isoDate);
    const lang = locale === 'pt-br' ? 'pt-BR' : 'en-US';
    return new Intl.DateTimeFormat(lang, {
      dateStyle: 'long',
      timeStyle: 'medium',
      timeZone: 'UTC',
    }).format(date);
  } catch {
    return isoDate;
  }
}

function truncateText(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.slice(0, maxLength - 3)}...`;
}

@Injectable()
export class PdfService {
  constructor(private readonly logger: Logger) {}

  async embedSignatures(pdfBuffer: Buffer, fields: EmbedFieldData[]): Promise<Buffer> {
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
        this.logger.warn(`Skipping field on page ${field.page}: page does not exist`);
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
        await this.embedDataUrlImage(pdfDoc, page, value, {
          x: fieldX,
          y: fieldY,
          width: fieldW,
          height: fieldH,
        });
      } else {
        this.embedTextField(page, cursiveFont, value, fieldX, fieldY, fieldW, fieldH);
      }
    }

    const result = await pdfDoc.save();
    return Buffer.from(result);
  }

  async appendEvidencePage(
    originalPdfBuffer: Buffer,
    signers: SignerEvidence[],
    documentTitle: string,
    locale = 'en'
  ): Promise<Buffer> {
    const pdfDoc = await PDFDocument.load(originalPdfBuffer, {
      ignoreEncryption: true,
    });

    const ctx: EvidencePageContext = {
      pdfDoc,
      fonts: {
        bold: await pdfDoc.embedFont(StandardFonts.HelveticaBold),
        regular: await pdfDoc.embedFont(StandardFonts.Helvetica),
      },
      colors: {
        primary: rgb(0.055, 0.227, 0.431),
        secondary: rgb(0.3, 0.3, 0.4),
        muted: rgb(0.45, 0.45, 0.55),
        accent: rgb(0.008, 0.518, 0.78),
        border: rgb(0.82, 0.84, 0.87),
        headerBg: rgb(0.945, 0.953, 0.965),
        cardBg: rgb(0.973, 0.976, 0.984),
        white: rgb(1, 1, 1),
      },
      labels: getEvidenceLabels(locale),
      locale,
      margin: MARGIN,
      contentWidth: CONTENT_WIDTH,
      pageWidth: PAGE_WIDTH,
      pageHeight: PAGE_HEIGHT,
      currentPage: pdfDoc.addPage([PAGE_WIDTH, PAGE_HEIGHT]),
      y: PAGE_HEIGHT - MARGIN,
    };

    this.drawEvidenceHeader(ctx);
    this.drawDocumentSection(ctx, documentTitle);
    await this.drawSignersSection(ctx, signers);
    this.drawEvidenceFooter(ctx);

    const finalPdfBytes = await pdfDoc.save();
    return Buffer.from(finalPdfBytes);
  }

  computeHash(buffer: Buffer): string {
    return sha256(buffer);
  }

  private async embedDataUrlImage(
    pdfDoc: PDFDocument,
    page: PDFPage,
    dataUrl: string,
    rect: ImageRect
  ): Promise<void> {
    try {
      const base64Data = dataUrl.split(',')[1];
      if (!base64Data) return;

      const imageBytes = Buffer.from(base64Data, 'base64');
      const image = dataUrl.includes('image/png')
        ? await pdfDoc.embedPng(imageBytes)
        : await pdfDoc.embedJpg(imageBytes);

      const padding = rect.padding ?? 0;
      const innerW = rect.width - padding * 2;
      const innerH = rect.height - padding * 2;
      const dims = image.scaleToFit(innerW, innerH);
      const centeredX = rect.x + padding + (innerW - dims.width) / 2;
      const centeredY = rect.y + padding + (innerH - dims.height) / 2;

      page.drawImage(image, {
        x: centeredX,
        y: centeredY,
        width: dims.width,
        height: dims.height,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to embed image: ${message}`);
    }
  }

  private embedTextField(
    page: PDFPage,
    font: PdfFont,
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

  private ensureSpace(ctx: EvidencePageContext, needed: number): void {
    if (ctx.y - needed < ctx.margin) {
      ctx.currentPage = ctx.pdfDoc.addPage([ctx.pageWidth, ctx.pageHeight]);
      ctx.y = ctx.pageHeight - ctx.margin;
    }
  }

  private drawHorizontalLine(ctx: EvidencePageContext, yPos: number): void {
    ctx.currentPage.drawLine({
      start: { x: ctx.margin, y: yPos },
      end: { x: ctx.margin + ctx.contentWidth, y: yPos },
      thickness: 0.5,
      color: ctx.colors.border,
    });
  }

  private drawEvidenceHeader(ctx: EvidencePageContext): void {
    const { currentPage, colors, labels, fonts, margin, contentWidth } = ctx;

    currentPage.drawRectangle({
      x: margin,
      y: ctx.y - 60,
      width: contentWidth,
      height: 70,
      color: colors.primary,
      borderWidth: 0,
    });

    currentPage.drawText(labels.title, {
      x: margin + 20,
      y: ctx.y - 28,
      size: 18,
      font: fonts.bold,
      color: colors.white,
    });

    currentPage.drawText(labels.subtitle, {
      x: margin + 20,
      y: ctx.y - 48,
      size: 9,
      font: fonts.regular,
      color: rgb(0.7, 0.8, 0.95),
    });

    ctx.y -= 85;
  }

  private drawDocumentSection(ctx: EvidencePageContext, documentTitle: string): void {
    const { currentPage, colors, labels, fonts, margin, contentWidth } = ctx;

    currentPage.drawRectangle({
      x: margin,
      y: ctx.y - 50,
      width: contentWidth,
      height: 55,
      color: colors.headerBg,
      borderWidth: 0,
    });

    currentPage.drawRectangle({
      x: margin,
      y: ctx.y - 50,
      width: contentWidth,
      height: 55,
      borderColor: colors.border,
      borderWidth: 0.5,
      color: colors.headerBg,
    });

    currentPage.drawText(labels.document, {
      x: margin + 12,
      y: ctx.y - 14,
      size: 7,
      font: fonts.bold,
      color: colors.muted,
    });

    currentPage.drawText(truncateText(documentTitle, MAX_TITLE_LENGTH), {
      x: margin + 12,
      y: ctx.y - 28,
      size: 11,
      font: fonts.bold,
      color: colors.primary,
    });

    const generatedAt = formatEvidenceDate(new Date().toISOString(), ctx.locale);
    currentPage.drawText(`${labels.generated}: ${generatedAt}`, {
      x: margin + 12,
      y: ctx.y - 43,
      size: 8,
      font: fonts.regular,
      color: colors.muted,
    });

    ctx.y -= 70;
  }

  private async drawSignersSection(
    ctx: EvidencePageContext,
    signers: SignerEvidence[]
  ): Promise<void> {
    const { currentPage, colors, labels, fonts, margin } = ctx;

    currentPage.drawText(`${labels.signers} (${signers.length})`, {
      x: margin,
      y: ctx.y,
      size: 8,
      font: fonts.bold,
      color: colors.muted,
    });

    ctx.y -= 15;

    for (let i = 0; i < signers.length; i++) {
      const signer = signers[i];
      const cardHeight = this.calculateSignerCardHeight(signer);
      this.ensureSpace(ctx, cardHeight + 15);
      await this.drawSignerCard(ctx, signer, i, cardHeight);
    }
  }

  private drawEvidenceFooter(ctx: EvidencePageContext): void {
    const { labels, fonts, colors, margin } = ctx;

    this.ensureSpace(ctx, 40);
    ctx.y -= 10;
    this.drawHorizontalLine(ctx, ctx.y);
    ctx.y -= 18;

    ctx.currentPage.drawText(labels.footer1, {
      x: margin,
      y: ctx.y,
      size: 7.5,
      font: fonts.regular,
      color: colors.muted,
    });

    ctx.y -= 12;

    ctx.currentPage.drawText(labels.footer2, {
      x: margin,
      y: ctx.y,
      size: 7.5,
      font: fonts.regular,
      color: colors.muted,
    });
  }

  private async drawSignerCard(
    ctx: EvidencePageContext,
    signer: SignerEvidence,
    index: number,
    cardHeight: number
  ): Promise<void> {
    const { currentPage, pdfDoc, fonts, colors, labels, locale, margin, contentWidth } = ctx;

    currentPage.drawRectangle({
      x: margin,
      y: ctx.y - cardHeight,
      width: contentWidth,
      height: cardHeight,
      color: colors.cardBg,
      borderColor: colors.border,
      borderWidth: 0.5,
    });

    currentPage.drawRectangle({
      x: margin,
      y: ctx.y - cardHeight,
      width: 3,
      height: cardHeight,
      color: colors.accent,
      borderWidth: 0,
    });

    if (signer.signatureData) {
      const sigBoxX = margin + contentWidth - SIG_BOX_W - 12;
      const sigBoxY = ctx.y - 42 - SIG_BOX_H - 8;

      currentPage.drawRectangle({
        x: sigBoxX,
        y: sigBoxY,
        width: SIG_BOX_W,
        height: SIG_BOX_H,
        borderColor: colors.border,
        borderWidth: 0.5,
        color: colors.white,
      });

      await this.embedDataUrlImage(pdfDoc, currentPage, signer.signatureData, {
        x: sigBoxX,
        y: sigBoxY,
        width: SIG_BOX_W,
        height: SIG_BOX_H,
        padding: 4,
      });
    } else {
      currentPage.drawText(labels.signed, {
        x: margin + contentWidth - 60,
        y: ctx.y - 16,
        size: 8,
        font: fonts.bold,
        color: colors.accent,
      });
    }

    currentPage.drawText(`${index + 1}.`, {
      x: margin + 14,
      y: ctx.y - 16,
      size: 10,
      font: fonts.bold,
      color: colors.primary,
    });

    currentPage.drawText(truncateText(signer.name, MAX_NAME_LENGTH), {
      x: margin + 30,
      y: ctx.y - 16,
      size: 10,
      font: fonts.bold,
      color: colors.primary,
    });

    currentPage.drawText(signer.email, {
      x: margin + 30,
      y: ctx.y - 30,
      size: 9,
      font: fonts.regular,
      color: colors.secondary,
    });

    this.drawHorizontalLine(ctx, ctx.y - 42);
    let detailY = ctx.y - 58;

    const formattedSignedAt = signer.signedAt ? formatEvidenceDate(signer.signedAt, locale) : '';

    detailY = this.drawDetailRow(currentPage, fonts, colors, {
      label: labels.signedAt,
      value: formattedSignedAt,
      x: margin + 14,
      y: detailY,
    });

    if (signer.ipAddress) {
      detailY = this.drawDetailRow(currentPage, fonts, colors, {
        label: labels.ipAddress,
        value: signer.ipAddress,
        x: margin + 14,
        y: detailY,
      });
    }

    if (signer.userAgent) {
      const maxLen = signer.signatureData ? 60 : 90;
      this.drawDetailRow(currentPage, fonts, colors, {
        label: labels.userAgent,
        value: truncateText(signer.userAgent, maxLen),
        x: margin + 14,
        y: detailY,
      });
    }

    ctx.y = ctx.y - cardHeight - 10;
  }

  private calculateSignerCardHeight(signer: SignerEvidence): number {
    let height = 82;
    if (signer.ipAddress) height += 14;
    if (signer.userAgent) height += 14;
    if (signer.signatureData) {
      height = Math.max(height, 82);
    }
    return height;
  }

  private drawDetailRow(
    page: PDFPage,
    fonts: { readonly bold: PdfFont; readonly regular: PdfFont },
    colors: EvidenceColors,
    options: {
      readonly label: string;
      readonly value: string;
      readonly x: number;
      readonly y: number;
    }
  ): number {
    page.drawText(`${options.label}:`, {
      x: options.x,
      y: options.y,
      size: 8,
      font: fonts.bold,
      color: colors.muted,
    });

    const labelWidth = fonts.bold.widthOfTextAtSize(`${options.label}: `, 8);

    page.drawText(options.value, {
      x: options.x + labelWidth,
      y: options.y,
      size: 8,
      font: fonts.regular,
      color: colors.secondary,
    });

    return options.y - 14;
  }
}

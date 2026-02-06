import { Injectable } from '@nestjs/common';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { sha256 } from '@connexto/shared';

export interface SignerEvidence {
  name: string;
  email: string;
  signedAt: string;
  ipAddress: string | null;
  userAgent: string | null;
}

@Injectable()
export class PdfService {
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

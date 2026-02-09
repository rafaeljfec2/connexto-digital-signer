import { Injectable, Logger, NotFoundException, BadRequestException } from '@nestjs/common';
import { PDFDocument } from 'pdf-lib';
import { AiGatewayService } from '../../ai-core/services/ai-gateway.service';
import { AiCacheService } from '../../ai-core/services/ai-cache.service';
import { AiUsageService } from '../../ai-core/services/ai-usage.service';
import { DocumentsService } from '../../documents/services/documents.service';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';
import {
  FIELD_DETECTION_SYSTEM_PROMPT,
  buildFieldDetectionUserPrompt,
} from '../prompts/field-detection.prompt';
import type { SuggestFieldsResponse, SuggestedField } from '../dto/suggest-fields-response.dto';
import { AI_MODELS } from '@connexto/ai';


// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PDFParse } = require('pdf-parse') as {
  PDFParse: new (options: { data: Uint8Array }) => {
    getText(): Promise<{ text: string; totalPages: number }>;
  };
};

const CACHE_PREFIX = 'ai-fields';
const MAX_PAGES_TO_ANALYZE = 20;
const MAX_TEXT_PER_PAGE = 4000;

const SIGNATURE_KEYWORDS = [
  'assinatura', 'signature', 'sign here',
  'nome:', 'name:', 'data:', 'date:',
  'cpf:', 'rg:', 'testemunha', 'witness',
  'contratante', 'contratado',
];

function isSignatureRelated(text: string): boolean {
  const lower = text.toLowerCase();
  if (SIGNATURE_KEYWORDS.some((kw) => lower.includes(kw))) return true;
  return /_{3,}/.test(text) || /\.{5,}/.test(text);
}

@Injectable()
export class AiFieldsService {
  private readonly logger = new Logger(AiFieldsService.name);

  constructor(
    private readonly aiGateway: AiGatewayService,
    private readonly aiCache: AiCacheService,
    private readonly aiUsage: AiUsageService,
    private readonly documentsService: DocumentsService,
    private readonly storage: S3StorageService,
  ) {}

  async suggestFields(
    documentId: string,
    tenantId: string,
    signerCount: number,
  ): Promise<SuggestFieldsResponse> {
    if (signerCount < 1) {
      throw new BadRequestException('At least one signer is required to suggest fields');
    }

    const document = await this.documentsService.findOne(documentId, tenantId);

    if (!document.originalFileKey) {
      throw new NotFoundException('Document has no uploaded PDF file');
    }

    const cacheKey = this.aiCache.buildCacheKey(
      CACHE_PREFIX,
      documentId,
      document.originalHash ?? '',
      String(signerCount),
    );

    const cached = await this.aiCache.get<SuggestFieldsResponse>(cacheKey);
    if (cached) {
      this.logger.debug(`Returning cached field suggestions for document ${documentId}`);
      return cached;
    }

    const pdfBuffer = await this.storage.get(document.originalFileKey);
    const pageTexts = await this.extractTextFromPdf(pdfBuffer);

    if (pageTexts.length === 0) {
      this.logger.warn(`No text extracted from document ${documentId}`);
      return {
        fields: [],
        detectedSigners: 0,
        documentType: 'unknown',
        confidence: 0,
      };
    }

    const userPrompt = buildFieldDetectionUserPrompt(pageTexts, signerCount);

    const response = await this.aiGateway.complete({
      model: AI_MODELS.OPENAI_GPT4O_MINI,
      messages: [
        { role: 'system', content: FIELD_DETECTION_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.1,
      maxTokens: 4096,
      responseFormat: 'json_object',
    });

    await this.aiUsage.trackUsage(tenantId, response.usage);

    const parsed = JSON.parse(response.content) as SuggestFieldsResponse;
    const validated = this.validateAndNormalize(parsed, pageTexts.length, signerCount);

    await this.aiCache.set(cacheKey, validated);

    this.logger.log(
      `Suggested ${String(validated.fields.length)} fields for document ${documentId} ` +
      `(type: ${validated.documentType}, confidence: ${String(validated.confidence)})`,
    );

    return validated;
  }

  private async extractTextFromPdf(pdfBuffer: Buffer): Promise<string[]> {
    try {
      const pdfDoc = await PDFDocument.load(pdfBuffer, { ignoreEncryption: true });
      const pageCount = Math.min(pdfDoc.getPageCount(), MAX_PAGES_TO_ANALYZE);

      const parser = new PDFParse({ data: new Uint8Array(pdfBuffer) });
      const parseResult = await parser.getText();
      const fullText = parseResult.text ?? '';

      const pageTexts = this.splitTextByPages(fullText, pageCount);

      const result: string[] = [];
      for (let i = 0; i < pageCount; i++) {
        const dims = pdfDoc.getPage(i).getSize();
        const rawText = pageTexts[i] ?? '';
        const header = `[Page dimensions: ${String(Math.round(dims.width))}x${String(Math.round(dims.height))}pt]\n`;

        if (!rawText.trim()) {
          result.push(`${header}[No text extracted]`);
          continue;
        }

        const annotated = this.annotateSignatureLines(rawText);
        result.push((header + annotated).slice(0, MAX_TEXT_PER_PAGE));
      }

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to process PDF: ${message}`);
      return [];
    }
  }

  private splitTextByPages(fullText: string, pageCount: number): string[] {
    if (pageCount <= 1) return [fullText];

    const parts = fullText.split(/\f/);
    if (parts.length >= pageCount) return parts.slice(0, pageCount);

    const lines = fullText.split('\n');
    const linesPerPage = Math.ceil(lines.length / pageCount);
    const pages: string[] = [];
    for (let i = 0; i < pageCount; i++) {
      const start = i * linesPerPage;
      const end = Math.min(start + linesPerPage, lines.length);
      pages.push(lines.slice(start, end).join('\n'));
    }
    return pages;
  }

  private annotateSignatureLines(text: string): string {
    const lines = text.split('\n');
    const totalLines = lines.length;
    if (totalLines === 0) return text;

    return lines
      .map((line, index) => {
        if (!line.trim()) return line;
        if (isSignatureRelated(line)) {
          const yApprox = (index / totalLines).toFixed(2);
          return `[y=${yApprox}] ${line}`;
        }
        return line;
      })
      .join('\n');
  }

  private validateAndNormalize(
    raw: SuggestFieldsResponse,
    pageCount: number,
    signerCount: number,
  ): SuggestFieldsResponse {
    const validFields: SuggestedField[] = [];

    for (const field of raw.fields ?? []) {
      if (!this.isValidFieldType(field.type)) continue;
      if (field.page < 1 || field.page > pageCount) continue;
      if (field.signerIndex < 0 || field.signerIndex >= signerCount) continue;

      validFields.push({
        type: field.type,
        page: field.page,
        x: this.clamp(field.x, 0, 0.95),
        y: this.clamp(field.y, 0, 0.95),
        width: this.clamp(field.width, 0.05, 0.5),
        height: this.clamp(field.height, 0.02, 0.15),
        label: String(field.label ?? '').slice(0, 100),
        signerIndex: field.signerIndex,
      });
    }

    return {
      fields: validFields,
      detectedSigners: Math.max(0, raw.detectedSigners ?? 0),
      documentType: String(raw.documentType ?? 'unknown').slice(0, 100),
      confidence: this.clamp(raw.confidence ?? 0, 0, 1),
    };
  }

  private isValidFieldType(type: string): type is SuggestedField['type'] {
    return ['signature', 'name', 'date', 'initials', 'text'].includes(type);
  }

  private clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
  }
}

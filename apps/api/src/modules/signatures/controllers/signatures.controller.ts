import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Req,
  Res,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import type { Response } from 'express';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RequestWithHeaders } from '@connexto/shared';
import { TenantId, Public } from '@connexto/shared';
import { SignaturesService } from '../services/signatures.service';
import { SignatureFieldsService } from '../services/signature-fields.service';
import { VerificationService } from '../services/verification.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { ListSignersQueryDto } from '../dto/list-signers-query.dto';
import { SearchSignerDocumentsDto } from '../dto/search-signer-documents.dto';
import { UpdateSignerDto } from '../dto/update-signer.dto';
import { AcceptSignatureDto } from '../dto/accept-signature.dto';
import { IdentifySignerDto } from '../dto/identify-signer.dto';
import { VerifyCodeDto } from '../dto/verify-code.dto';
import { CreateSignatureFieldDto } from '../dto/create-signature-field.dto';
import { UpdateSignatureFieldDto } from '../dto/update-signature-field.dto';
import { BatchUpdateFieldsDto } from '../dto/batch-update-fields.dto';
import { SendDocumentDto } from '../dto/send-document.dto';
import { throttleConfig } from '../../../common/config/throttle.config';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';

function getClientIp(
  req: RequestWithHeaders & { ip?: string; socket?: { remoteAddress?: string }; connection?: { remoteAddress?: string } }
): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    if (first) return first;
  }
  return req.ip ?? req.socket?.remoteAddress ?? req.connection?.remoteAddress ?? '';
}

@ApiTags('Signers')
@RequireAuthMethod('jwt')
@Controller('signers')
export class SignersListController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get()
  listAllSigners(
    @TenantId() tenantId: string,
    @Query() query: ListSignersQueryDto,
  ) {
    return this.signaturesService.findByTenant(tenantId, query);
  }

  @Get('search-documents')
  searchDocuments(
    @TenantId() tenantId: string,
    @Query() query: SearchSignerDocumentsDto,
  ) {
    return this.signaturesService.searchPendingDocuments(tenantId, query.q);
  }
}

@ApiTags('Signers')
@RequireAuthMethod('jwt')
@Controller('envelopes/:envelopeId/signers')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  addSigner(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string,
    @Body() createSignerDto: CreateSignerDto
  ) {
    return this.signaturesService.addSigner(
      tenantId,
      envelopeId,
      createSignerDto
    );
  }

  @Get()
  listSigners(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string
  ) {
    return this.signaturesService.findByEnvelope(envelopeId, tenantId);
  }

  @Patch(':signerId')
  updateSigner(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @Param('signerId', ParseUUIDPipe) signerId: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateSignerDto
  ) {
    return this.signaturesService.updateSigner(tenantId, envelopeId, signerId, dto);
  }

  @Delete(':signerId')
  removeSigner(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @Param('signerId', ParseUUIDPipe) signerId: string,
    @TenantId() tenantId: string
  ) {
    return this.signaturesService.removeSigner(tenantId, envelopeId, signerId);
  }
}

@ApiTags('SignatureFields')
@RequireAuthMethod('jwt')
@Controller('documents/:documentId/fields')
export class SignatureFieldsController {
  constructor(private readonly fieldsService: SignatureFieldsService) {}

  @Post()
  createField(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string,
    @Body() dto: CreateSignatureFieldDto
  ) {
    return this.fieldsService.create(tenantId, documentId, dto);
  }

  @Get()
  listFields(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string
  ) {
    return this.fieldsService.findByDocument(tenantId, documentId);
  }

  @Put('batch')
  replaceFields(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string,
    @Body() dto: BatchUpdateFieldsDto
  ) {
    return this.fieldsService.replaceAll(tenantId, documentId, dto);
  }

  @Put(':fieldId')
  updateField(
    @Param('documentId') documentId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @TenantId() tenantId: string,
    @Body() dto: UpdateSignatureFieldDto
  ) {
    return this.fieldsService.update(tenantId, documentId, fieldId, dto);
  }

  @Delete(':fieldId')
  removeField(
    @Param('documentId') documentId: string,
    @Param('fieldId', ParseUUIDPipe) fieldId: string,
    @TenantId() tenantId: string
  ) {
    return this.fieldsService.remove(tenantId, documentId, fieldId);
  }
}

@ApiTags('Sign')
@Controller('sign')
export class SignController {
  constructor(
    private readonly signaturesService: SignaturesService,
    private readonly verificationService: VerificationService,
  ) {}

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token')
  getSignerByToken(@Param('token') token: string) {
    return this.signaturesService.findByTokenWithEnvelope(token);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token/pdf')
  async getSignerPdf(
    @Param('token') token: string,
    @Query('documentId') documentId: string | undefined,
    @Res() res: Response
  ) {
    const buffer = await this.signaturesService.getSignerPdf(token, documentId);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Cache-Control': 'private, max-age=300',
    });
    res.end(buffer);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token/signed-pdf')
  async getSignerSignedPdf(
    @Param('token') token: string,
    @Query('documentId') documentId: string | undefined,
    @Res() res: Response
  ) {
    const buffer = await this.signaturesService.getSignerSignedPdf(token, documentId);
    if (buffer === null) {
      res.status(404).json({ message: 'Signed document is not available yet' });
      return;
    }
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Length': buffer.length,
      'Content-Disposition': 'attachment; filename="signed-document.pdf"',
      'Cache-Control': 'private, max-age=300',
    });
    res.end(buffer);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token/fields')
  getSignerFields(
    @Param('token') token: string,
    @Query('documentId') documentId: string | undefined,
  ) {
    return this.signaturesService.getSignerFields(token, documentId);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post(':token/accept')
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptSignatureDto,
    @Req() req: RequestWithHeaders & { ip?: string; socket?: { remoteAddress?: string }; connection?: { remoteAddress?: string } }
  ) {
    return this.signaturesService.acceptSignature(
      token,
      dto,
      {
        ipAddress: getClientIp(req),
        userAgent: (req.headers['user-agent'] as string) ?? '',
      }
    );
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token/summary')
  getSignerSummary(@Param('token') token: string) {
    return this.signaturesService.getEnvelopeAuditSummaryByToken(token);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post(':token/identify')
  identifySigner(
    @Param('token') token: string,
    @Body() dto: IdentifySignerDto,
  ) {
    return this.signaturesService.identifySigner(token, dto);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post(':token/send-code')
  sendCode(@Param('token') token: string) {
    return this.verificationService.sendCode(token);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post(':token/verify-code')
  verifyCode(
    @Param('token') token: string,
    @Body() dto: VerifyCodeDto,
  ) {
    return this.verificationService.verifyCode(token, dto.code);
  }
}

@ApiTags('Envelopes')
@RequireAuthMethod('jwt')
@Controller('envelopes/:envelopeId')
export class DocumentSendController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get('summary')
  getEnvelopeSummary(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string,
  ) {
    return this.signaturesService.getEnvelopeAuditSummary(envelopeId, tenantId);
  }

  @Get('tracking')
  getEnvelopeTracking(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string,
  ) {
    return this.signaturesService.getEnvelopeTracking(envelopeId, tenantId);
  }

  @Get('send/preview')
  previewSend(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string,
    @Query() dto: SendDocumentDto
  ) {
    return this.signaturesService.previewSend(tenantId, envelopeId, dto.message);
  }

  @Post('send')
  sendEnvelope(
    @Param('envelopeId', ParseUUIDPipe) envelopeId: string,
    @TenantId() tenantId: string,
    @Body() dto: SendDocumentDto
  ) {
    return this.signaturesService.sendEnvelope(tenantId, envelopeId, dto.message);
  }
}

import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Req,
  Put,
  Delete,
  ParseUUIDPipe,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RequestWithHeaders } from '@connexto/shared';
import { TenantId, Public } from '@connexto/shared';
import { SignaturesService } from '../services/signatures.service';
import { SignatureFieldsService } from '../services/signature-fields.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { AcceptSignatureDto } from '../dto/accept-signature.dto';
import { CreateSignatureFieldDto } from '../dto/create-signature-field.dto';
import { UpdateSignatureFieldDto } from '../dto/update-signature-field.dto';
import { BatchUpdateFieldsDto } from '../dto/batch-update-fields.dto';
import { SendDocumentDto } from '../dto/send-document.dto';
import { throttleConfig } from '../../../common/config/throttle.config';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';

function getClientIp(req: RequestWithHeaders & { socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    return first ?? req.socket?.remoteAddress ?? '';
  }
  return req.socket?.remoteAddress ?? '';
}

@ApiTags('Signers')
@RequireAuthMethod('jwt')
@Controller('documents/:documentId/signers')
export class SignaturesController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Post()
  addSigner(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string,
    @Body() createSignerDto: CreateSignerDto
  ) {
    return this.signaturesService.addSigner(
      tenantId,
      documentId,
      createSignerDto
    );
  }

  @Get()
  listSigners(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string
  ) {
    return this.signaturesService.findByDocument(documentId, tenantId);
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
  constructor(private readonly signaturesService: SignaturesService) {}

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Get(':token')
  getSignerByToken(@Param('token') token: string) {
    return this.signaturesService.findByToken(token);
  }

  @Public()
  @Throttle(throttleConfig.publicLimit, throttleConfig.publicTtlSeconds)
  @Post(':token/accept')
  accept(
    @Param('token') token: string,
    @Body() dto: AcceptSignatureDto,
    @Req() req: RequestWithHeaders & { socket?: { remoteAddress?: string } }
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
}

@ApiTags('Documents')
@RequireAuthMethod('jwt')
@Controller('documents/:documentId')
export class DocumentSendController {
  constructor(private readonly signaturesService: SignaturesService) {}

  @Get('send/preview')
  previewSend(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string,
    @Query() dto: SendDocumentDto
  ) {
    return this.signaturesService.previewSend(tenantId, documentId, dto.message);
  }

  @Post('send')
  sendDocument(
    @Param('documentId') documentId: string,
    @TenantId() tenantId: string,
    @Body() dto: SendDocumentDto
  ) {
    return this.signaturesService.sendDocument(tenantId, documentId, dto.message);
  }
}

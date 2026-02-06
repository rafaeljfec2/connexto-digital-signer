import { Controller, Get, Post, Body, Param, Req } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RequestWithHeaders } from '@connexto/shared';
import { TenantId, Public } from '@connexto/shared';
import { SignaturesService } from '../services/signatures.service';
import { CreateSignerDto } from '../dto/create-signer.dto';
import { AcceptSignatureDto } from '../dto/accept-signature.dto';
import { throttleConfig } from '../../../common/config/throttle.config';

function getClientIp(req: RequestWithHeaders & { socket?: { remoteAddress?: string } }): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') {
    const first = forwarded.split(',')[0]?.trim();
    return first ?? req.socket?.remoteAddress ?? '';
  }
  return req.socket?.remoteAddress ?? '';
}

@ApiTags('Signers')
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

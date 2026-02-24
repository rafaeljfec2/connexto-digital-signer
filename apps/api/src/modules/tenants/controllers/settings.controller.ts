import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
  Post,
  Body,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { TenantId } from '@connexto/shared';
import { CertificateService } from '../services/certificate.service';
import { TenantsService } from '../services/tenants.service';
import { UpdateBrandingDto } from '../dto/update-branding.dto';
import { UpdateDefaultsDto } from '../dto/update-defaults.dto';
import { UpdateNotificationsDto } from '../dto/update-notifications.dto';
import { RequireAuthMethod } from '../../../common/decorators/auth-method.decorator';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';

const ALLOWED_CERT_MIMETYPES = new Set([
  'application/x-pkcs12',
  'application/pkcs12',
  'application/octet-stream',
]);

const ALLOWED_IMAGE_MIMETYPES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]);

const MAX_CERTIFICATE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

@ApiTags('Settings')
@ApiBearerAuth()
@RequireAuthMethod('jwt')
@Controller('settings')
export class SettingsController {
  constructor(
    private readonly certificateService: CertificateService,
    private readonly tenantsService: TenantsService,
    private readonly storageService: S3StorageService,
  ) {}

  @Post('certificate')
  @ApiOperation({ summary: 'Upload a digital certificate (.p12/.pfx)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Certificate uploaded' })
  @ApiResponse({ status: 400, description: 'Invalid certificate file' })
  @UseInterceptors(FileInterceptor('file'))
  async uploadCertificate(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body('password') password: string,
  ) {
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Certificate file is required');
    }
    if (file.size > MAX_CERTIFICATE_SIZE_BYTES) {
      throw new BadRequestException('Certificate file exceeds 5MB');
    }
    const originalName = file.originalname?.toLowerCase() ?? '';
    const hasValidExtension = originalName.endsWith('.p12') || originalName.endsWith('.pfx');
    const hasValidMimetype = ALLOWED_CERT_MIMETYPES.has(file.mimetype);
    if (!hasValidExtension && !hasValidMimetype) {
      throw new BadRequestException('Only .p12 or .pfx files are allowed');
    }
    if (!password?.trim()) {
      throw new BadRequestException('Certificate password is required');
    }
    return this.certificateService.uploadCertificate(tenantId, file.buffer, password.trim());
  }

  @Get('certificate')
  @ApiOperation({ summary: 'Get digital certificate status' })
  @ApiResponse({ status: 200, description: 'Certificate status' })
  async getCertificateStatus(@TenantId() tenantId: string) {
    const status = await this.certificateService.getCertificateStatus(tenantId);
    return { configured: status !== null, ...(status ? { certificate: status } : {}) };
  }

  @Delete('certificate')
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeCertificate(@TenantId() tenantId: string) {
    await this.certificateService.removeCertificate(tenantId);
  }

  @Get('branding')
  async getBranding(@TenantId() tenantId: string) {
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    return {
      companyName: tenant.branding?.name ?? tenant.name,
      primaryColor: tenant.branding?.primaryColor ?? '#0E3A6E',
      logoUrl: tenant.branding?.logoUrl ?? null,
    };
  }

  @Patch('branding')
  async updateBranding(
    @TenantId() tenantId: string,
    @Body() dto: UpdateBrandingDto,
  ) {
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    const currentBranding = tenant.branding ?? { name: undefined, primaryColor: undefined, logoUrl: undefined };
    const branding = { ...currentBranding, ...dto };
    const saved = await this.tenantsService.updatePartial(tenantId, { branding });
    return {
      companyName: saved.branding?.name ?? saved.name,
      primaryColor: saved.branding?.primaryColor ?? '#0E3A6E',
      logoUrl: saved.branding?.logoUrl ?? null,
    };
  }

  @Post('logo')
  @UseInterceptors(FileInterceptor('file'))
  async uploadLogo(
    @TenantId() tenantId: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file?.buffer || !Buffer.isBuffer(file.buffer)) {
      throw new BadRequestException('Logo file is required');
    }
    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw new BadRequestException('Logo file exceeds 2MB');
    }
    if (!ALLOWED_IMAGE_MIMETYPES.has(file.mimetype)) {
      throw new BadRequestException('Only PNG, JPEG, WebP or SVG files are allowed');
    }
    const ext = file.originalname?.split('.').pop()?.toLowerCase() ?? 'png';
    const key = `tenants/${tenantId}/logo.${ext}`;
    await this.storageService.put(key, file.buffer, file.mimetype);
    const logoUrl = await this.storageService.getSignedUrl(key, 86400 * 365);
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    const currentBranding = tenant.branding ?? { name: undefined, primaryColor: undefined, logoUrl: undefined };
    const branding = { ...currentBranding, logoUrl: key };
    await this.tenantsService.updatePartial(tenantId, { branding });
    return { logoUrl };
  }

  @Get('defaults')
  async getDefaults(@TenantId() tenantId: string) {
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    return {
      defaultSigningLanguage: tenant.defaultSigningLanguage,
      defaultReminderInterval: tenant.defaultReminderInterval,
      defaultClosureMode: tenant.defaultClosureMode,
    };
  }

  @Patch('defaults')
  async updateDefaults(
    @TenantId() tenantId: string,
    @Body() dto: UpdateDefaultsDto,
  ) {
    const saved = await this.tenantsService.updatePartial(tenantId, {
      ...(dto.defaultSigningLanguage ? { defaultSigningLanguage: dto.defaultSigningLanguage } : {}),
      ...(dto.defaultReminderInterval ? { defaultReminderInterval: dto.defaultReminderInterval } : {}),
      ...(dto.defaultClosureMode ? { defaultClosureMode: dto.defaultClosureMode } : {}),
    });
    return {
      defaultSigningLanguage: saved.defaultSigningLanguage,
      defaultReminderInterval: saved.defaultReminderInterval,
      defaultClosureMode: saved.defaultClosureMode,
    };
  }

  @Get('notifications')
  async getNotifications(@TenantId() tenantId: string) {
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    return { emailSenderName: tenant.emailSenderName ?? '' };
  }

  @Patch('notifications')
  async updateNotifications(
    @TenantId() tenantId: string,
    @Body() dto: UpdateNotificationsDto,
  ) {
    const senderName = dto.emailSenderName?.trim() || null;
    const saved = await this.tenantsService.updatePartial(tenantId, { emailSenderName: senderName });
    return { emailSenderName: saved.emailSenderName ?? '' };
  }

  @Get('api-key')
  @ApiOperation({ summary: 'Get legacy API key status' })
  @ApiResponse({ status: 200, description: 'API key status' })
  async getApiKeyStatus(@TenantId() tenantId: string) {
    const tenant = await this.tenantsService.findOne(tenantId, tenantId);
    return {
      configured: tenant.apiKeyHash !== null,
      lastFour: tenant.apiKeyLastFour ?? null,
    };
  }

  @Post('api-key/regenerate')
  @ApiOperation({ summary: 'Regenerate legacy API key' })
  @ApiResponse({ status: 201, description: 'New API key generated' })
  async regenerateApiKey(@TenantId() tenantId: string) {
    const newKey = await this.tenantsService.regenerateApiKey(tenantId);
    return { apiKey: newKey };
  }
}

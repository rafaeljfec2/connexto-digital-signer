import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUrl,
  IsArray,
  IsOptional,
  IsBoolean,
  IsObject,
} from 'class-validator';

export class UpdateWebhookConfigDto {
  @IsOptional()
  @IsUrl()
  @ApiPropertyOptional({ example: 'https://hooks.acme.com/webhooks/updated' })
  readonly url?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  @ApiPropertyOptional({ isArray: true, example: ['signer.added', 'signature.completed'] })
  readonly events?: string[];

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  readonly isActive?: boolean;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    example: { maxAttempts: 5, initialDelayMs: 1000, backoffMultiplier: 2 },
  })
  readonly retryConfig?: { maxAttempts?: number; initialDelayMs?: number; backoffMultiplier?: number };
}

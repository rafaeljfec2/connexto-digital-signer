import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUrl, IsArray, IsOptional, IsObject } from 'class-validator';

export class CreateWebhookConfigDto {
  @IsUrl()
  @ApiProperty({ example: 'https://hooks.acme.com/webhooks/signature' })
  readonly url!: string;

  @IsString()
  @ApiProperty({ example: 'whsec_1234567890' })
  readonly secret!: string;

  @IsArray()
  @IsString({ each: true })
  @ApiProperty({ isArray: true, example: ['signer.added', 'signature.completed'] })
  readonly events!: string[];

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    example: { maxAttempts: 5, initialDelayMs: 1000, backoffMultiplier: 2 },
  })
  readonly retryConfig?: { maxAttempts?: number; initialDelayMs?: number; backoffMultiplier?: number };
}

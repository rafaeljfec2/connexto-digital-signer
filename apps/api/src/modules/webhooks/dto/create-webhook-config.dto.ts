import { IsString, IsUrl, IsArray, IsOptional, IsObject } from 'class-validator';

export class CreateWebhookConfigDto {
  @IsUrl()
  url!: string;

  @IsString()
  secret!: string;

  @IsArray()
  @IsString({ each: true })
  events!: string[];

  @IsOptional()
  @IsObject()
  retryConfig?: { maxAttempts?: number; initialDelayMs?: number; backoffMultiplier?: number };
}

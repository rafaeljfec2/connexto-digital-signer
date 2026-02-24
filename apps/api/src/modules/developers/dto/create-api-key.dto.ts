import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  MinLength,
  MaxLength,
  IsArray,
  ArrayMinSize,
  IsIn,
  IsOptional,
  IsDateString,
} from 'class-validator';
import { ALL_API_KEY_SCOPES, type ApiKeyScope } from '../entities/api-key.entity';

export class CreateApiKeyDto {
  @ApiProperty({ description: 'Human-readable name for the API key', example: 'Production Backend' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  readonly name!: string;

  @ApiProperty({
    description: 'Permission scopes',
    example: ['documents:read', 'documents:write'],
    enum: ALL_API_KEY_SCOPES,
    isArray: true,
  })
  @IsArray()
  @ArrayMinSize(1)
  @IsIn([...ALL_API_KEY_SCOPES], { each: true })
  readonly scopes!: ApiKeyScope[];

  @ApiPropertyOptional({ description: 'Expiration date (ISO 8601)', example: '2026-12-31T23:59:59Z' })
  @IsOptional()
  @IsDateString()
  readonly expiresAt?: string;
}

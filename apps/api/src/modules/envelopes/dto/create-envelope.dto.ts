import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUUID,
  MaxLength,
  IsDateString,
  IsIn,
  IsEnum,
} from 'class-validator';
import { SigningMode } from '../entities/envelope.entity';

export class CreateEnvelopeDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Service Agreement Q1' })
  readonly title!: string;

  @IsUUID()
  @ApiProperty({ description: 'Folder to place the envelope in' })
  readonly folderId!: string;

  @IsOptional()
  @IsEnum(SigningMode)
  @ApiPropertyOptional({ enum: SigningMode })
  readonly signingMode?: SigningMode;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  readonly expiresAt?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', '1_day', '2_days', '3_days', '7_days'])
  @ApiPropertyOptional({ example: 'none' })
  readonly reminderInterval?: string;

  @IsOptional()
  @IsString()
  @IsIn(['pt-br', 'en'])
  @ApiPropertyOptional({ example: 'pt-br' })
  readonly signingLanguage?: string;

  @IsOptional()
  @IsString()
  @IsIn(['automatic', 'manual'])
  @ApiPropertyOptional({ example: 'automatic' })
  readonly closureMode?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsIn,
  IsBoolean,
} from 'class-validator';
import { SigningMode } from '../../envelopes/entities/envelope.entity';

export class UpdateTemplateDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ example: 'NDA Template v2' })
  readonly name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiPropertyOptional()
  readonly description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional()
  readonly category?: string;

  @IsOptional()
  @IsEnum(SigningMode)
  @ApiPropertyOptional({ enum: SigningMode })
  readonly signingMode?: SigningMode;

  @IsOptional()
  @IsString()
  @IsIn(['pt-br', 'en'])
  @ApiPropertyOptional()
  readonly signingLanguage?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', '1_day', '2_days', '3_days', '7_days'])
  @ApiPropertyOptional()
  readonly reminderInterval?: string;

  @IsOptional()
  @IsString()
  @IsIn(['automatic', 'manual'])
  @ApiPropertyOptional()
  readonly closureMode?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly isActive?: boolean;
}

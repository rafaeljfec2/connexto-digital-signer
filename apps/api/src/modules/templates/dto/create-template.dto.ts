import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsEnum,
  IsIn,
} from 'class-validator';
import { SigningMode } from '../../envelopes/entities/envelope.entity';

export class CreateTemplateDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'NDA Template' })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiPropertyOptional({ example: 'Standard non-disclosure agreement' })
  readonly description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'legal' })
  readonly category?: string;

  @IsOptional()
  @IsEnum(SigningMode)
  @ApiPropertyOptional({ enum: SigningMode })
  readonly signingMode?: SigningMode;

  @IsOptional()
  @IsString()
  @IsIn(['pt-br', 'en'])
  @ApiPropertyOptional({ example: 'pt-br' })
  readonly signingLanguage?: string;

  @IsOptional()
  @IsString()
  @IsIn(['none', '1_day', '2_days', '3_days', '7_days'])
  @ApiPropertyOptional({ example: 'none' })
  readonly reminderInterval?: string;

  @IsOptional()
  @IsString()
  @IsIn(['automatic', 'manual'])
  @ApiPropertyOptional({ example: 'automatic' })
  readonly closureMode?: string;
}

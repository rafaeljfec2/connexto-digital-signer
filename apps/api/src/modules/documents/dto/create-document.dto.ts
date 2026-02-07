import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength, IsIn } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Service Agreement' })
  readonly title!: string;

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

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Service Agreement' })
  readonly title!: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-12-31T23:59:59.000Z' })
  readonly expiresAt?: string;
}

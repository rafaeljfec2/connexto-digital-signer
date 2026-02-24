import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength } from 'class-validator';

export class CreateTemplateFromEnvelopeDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'NDA Template' })
  readonly name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiPropertyOptional({ example: 'Template created from envelope' })
  readonly description?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  @ApiPropertyOptional({ example: 'legal' })
  readonly category?: string;
}

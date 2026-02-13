import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsUUID, IsInt, Min } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Service Agreement' })
  readonly title!: string;

  @IsUUID()
  @ApiProperty({ description: 'Envelope this document belongs to' })
  readonly envelopeId!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ example: 0 })
  readonly position?: number;
}

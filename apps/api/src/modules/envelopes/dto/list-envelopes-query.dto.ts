import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';
import { EnvelopeStatus } from '../entities/envelope.entity';

export class ListEnvelopesQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 1 })
  readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ example: 10 })
  readonly limit?: number;

  @IsOptional()
  @IsEnum(EnvelopeStatus)
  @ApiPropertyOptional({ enum: EnvelopeStatus })
  readonly status?: EnvelopeStatus;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Filter by folder' })
  readonly folderId?: string;
}

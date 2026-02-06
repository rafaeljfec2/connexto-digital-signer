import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';
import { DocumentStatus } from '../entities/document.entity';

export class ListDocumentsQueryDto {
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
  @IsEnum(DocumentStatus)
  @ApiPropertyOptional({ enum: DocumentStatus })
  readonly status?: DocumentStatus;
}

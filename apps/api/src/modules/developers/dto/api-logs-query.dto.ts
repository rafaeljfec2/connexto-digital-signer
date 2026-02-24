import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt, Min, Max, IsDateString } from 'class-validator';
import { Type } from 'class-transformer';

export class ApiLogsQueryDto {
  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'GET', description: 'Filter by HTTP method' })
  readonly method?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '/documents', description: 'Filter by path (partial match)' })
  readonly path?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(100)
  @Max(599)
  @ApiPropertyOptional({ example: 200, description: 'Filter by status code' })
  readonly statusCode?: number;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-02-01T00:00:00Z', description: 'Start date (ISO 8601)' })
  readonly dateFrom?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '2026-02-28T23:59:59Z', description: 'End date (ISO 8601)' })
  readonly dateTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ default: 1 })
  readonly page?: number;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @ApiPropertyOptional({ default: 20 })
  readonly limit?: number;
}

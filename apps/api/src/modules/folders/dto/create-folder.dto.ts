import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class CreateFolderDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Contracts 2026' })
  readonly name!: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Parent folder ID (null for root)' })
  readonly parentId?: string;
}

import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, IsUUID, MaxLength } from 'class-validator';

export class UpdateFolderDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiPropertyOptional({ example: 'Renamed Folder' })
  readonly name?: string;

  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ description: 'Move to another parent folder' })
  readonly parentId?: string | null;
}

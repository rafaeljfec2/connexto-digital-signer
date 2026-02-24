import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional, MaxLength, IsInt, Min } from 'class-validator';

export class AddTemplateDocumentDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'Non-Disclosure Agreement' })
  readonly title!: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @ApiPropertyOptional({ example: 0 })
  readonly position?: number;
}

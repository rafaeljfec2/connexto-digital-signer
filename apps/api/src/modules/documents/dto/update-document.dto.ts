import { PartialType } from '@nestjs/mapped-types';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEnum, IsOptional } from 'class-validator';
import { CreateDocumentDto } from './create-document.dto';
import { SigningMode } from '../entities/document.entity';

export class UpdateDocumentDto extends PartialType(CreateDocumentDto) {
  @IsOptional()
  @IsEnum(SigningMode)
  @ApiPropertyOptional({ enum: SigningMode })
  readonly signingMode?: SigningMode;
}

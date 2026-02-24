import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { SignatureFieldType } from '../../signatures/entities/signature-field.entity';

export class TemplateFieldInputDto {
  @IsOptional()
  @IsUUID()
  @ApiPropertyOptional({ format: 'uuid' })
  readonly id?: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid', description: 'Template signer slot ID' })
  readonly templateSignerId!: string;

  @IsEnum(SignatureFieldType)
  @ApiProperty({ enum: SignatureFieldType })
  readonly type!: SignatureFieldType;

  @IsInt()
  @Min(1)
  @ApiProperty({ example: 1 })
  readonly page!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.1 })
  readonly x!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.2 })
  readonly y!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.3 })
  readonly width!: number;

  @IsNumber()
  @Min(0)
  @ApiProperty({ example: 0.1 })
  readonly height!: number;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: true })
  readonly required?: boolean;
}

export class BatchUpdateTemplateFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateFieldInputDto)
  @ApiProperty({ type: [TemplateFieldInputDto] })
  readonly fields!: ReadonlyArray<TemplateFieldInputDto>;
}

import { ApiProperty } from '@nestjs/swagger';
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
import { SignatureFieldType } from '../entities/signature-field.entity';

export class SignatureFieldInputDto {
  @IsOptional()
  @IsUUID()
  @ApiProperty({ format: 'uuid', required: false })
  readonly id?: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly signerId!: string;

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
  @ApiProperty({ example: true, required: false })
  readonly required?: boolean;
}

export class BatchUpdateFieldsDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SignatureFieldInputDto)
  @ApiProperty({ type: [SignatureFieldInputDto] })
  readonly fields!: SignatureFieldInputDto[];
}

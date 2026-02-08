import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsOptional, IsString, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldValueDto {
  @IsUUID()
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  readonly fieldId!: string;

  @IsString()
  @ApiProperty({ example: 'data:image/png;base64,...' })
  readonly value!: string;
}

export class AcceptSignatureDto {
  @IsString()
  @ApiProperty({ example: 'I agree to sign this document' })
  readonly consent!: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => FieldValueDto)
  @ApiProperty({ type: [FieldValueDto] })
  readonly fields!: FieldValueDto[];

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: 'data:image/png;base64,...' })
  readonly signatureData?: string;
}

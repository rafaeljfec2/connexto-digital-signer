import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsArray, IsNumber, IsOptional, IsString, IsUUID, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class FieldValueDto {
  @IsUUID()
  @ApiProperty({ example: '550e8400-e29b-41d4-a716-446655440000' })
  readonly fieldId!: string;

  @IsString()
  @ApiProperty({ example: 'data:image/png;base64,...' })
  readonly value!: string;
}

export class GeolocationDto {
  @IsNumber()
  @Min(-90)
  @Max(90)
  @ApiProperty({ example: -23.5505199 })
  readonly latitude!: number;

  @IsNumber()
  @Min(-180)
  @Max(180)
  @ApiProperty({ example: -46.6333094 })
  readonly longitude!: number;
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

  @IsOptional()
  @ValidateNested()
  @Type(() => GeolocationDto)
  @ApiPropertyOptional({ type: GeolocationDto })
  readonly geolocation?: GeolocationDto;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsInt, IsNumber, IsUUID, Min } from 'class-validator';
import { SignatureFieldType } from '../entities/signature-field.entity';

export class CreateSignatureFieldDto {
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

  @IsBoolean()
  @ApiProperty({ example: true })
  readonly required!: boolean;
}

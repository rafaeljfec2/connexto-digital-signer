import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  IsUUID,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class TemplateSignerAssignmentDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'contractor', description: 'Matches TemplateSigner.label' })
  readonly slotLabel!: string;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'John Dev' })
  readonly name!: string;

  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'john@acme.com' })
  readonly email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  @ApiPropertyOptional({ example: '123.456.789-00' })
  readonly cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?\d[\d\s()-]{7,18}$/, { message: 'Phone must be in a valid format' })
  @ApiPropertyOptional({ example: '+5511999998888' })
  readonly phone?: string;

  @IsOptional()
  @IsString()
  @ApiPropertyOptional({ example: '1990-01-15' })
  readonly birthDate?: string;
}

export class CreateEnvelopeFromTemplateDto {
  @IsUUID()
  @ApiProperty({ description: 'Target folder for the new envelope' })
  readonly folderId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional({ example: 'NDA - Acme Corp' })
  readonly title?: string;

  @IsOptional()
  @ApiPropertyOptional({
    example: { company_name: 'Acme Corp', start_date: '2026-03-01' },
    description: 'Key-value map of template variables',
  })
  readonly variables?: Record<string, string>;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateSignerAssignmentDto)
  @ApiProperty({ type: [TemplateSignerAssignmentDto] })
  readonly signers!: ReadonlyArray<TemplateSignerAssignmentDto>;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: false })
  readonly autoSend?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(2000)
  @ApiPropertyOptional({ description: 'Custom email message to signers' })
  readonly message?: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsArray,
  IsBoolean,
  IsEnum,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { TemplateVariableType } from '../entities/template-variable.entity';

export class TemplateVariableInputDto {
  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z][a-z0-9_]*$/, {
    message: 'Variable key must be lowercase alphanumeric with underscores, starting with a letter',
  })
  @ApiProperty({ example: 'company_name' })
  readonly key!: string;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Company Name' })
  readonly label!: string;

  @IsOptional()
  @IsEnum(TemplateVariableType)
  @ApiPropertyOptional({ enum: TemplateVariableType, default: TemplateVariableType.TEXT })
  readonly type?: TemplateVariableType;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ default: true })
  readonly required?: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @ApiPropertyOptional()
  readonly defaultValue?: string;
}

export class BatchUpdateTemplateVariablesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TemplateVariableInputDto)
  @ApiProperty({ type: [TemplateVariableInputDto] })
  readonly variables!: ReadonlyArray<TemplateVariableInputDto>;
}

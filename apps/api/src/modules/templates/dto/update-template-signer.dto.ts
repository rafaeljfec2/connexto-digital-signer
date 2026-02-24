import { ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
  Min,
  IsBoolean,
  IsIn,
} from 'class-validator';
import { SignerRole } from '../../signatures/entities/signer.entity';

export class UpdateTemplateSignerDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  @ApiPropertyOptional({ example: 'contractor' })
  readonly label?: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SignerRole))
  @ApiPropertyOptional({ enum: SignerRole })
  readonly role?: SignerRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional()
  readonly order?: number;

  @IsOptional()
  @IsString()
  @IsIn(['email', 'none'])
  @ApiPropertyOptional()
  readonly authMethod?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly requestEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly requestCpf?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional()
  readonly requestPhone?: boolean;
}

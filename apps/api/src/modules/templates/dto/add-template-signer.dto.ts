import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
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

export class AddTemplateSignerDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'contractor' })
  readonly label!: string;

  @IsOptional()
  @IsString()
  @IsIn(Object.values(SignerRole))
  @ApiPropertyOptional({ example: SignerRole.SIGNER, enum: SignerRole })
  readonly role?: SignerRole;

  @IsOptional()
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 1 })
  readonly order?: number;

  @IsOptional()
  @IsString()
  @IsIn(['email', 'none'])
  @ApiPropertyOptional({ example: 'email' })
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

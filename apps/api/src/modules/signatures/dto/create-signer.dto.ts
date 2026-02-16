import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsEmail,
  MaxLength,
  IsInt,
  IsOptional,
  Min,
  IsBoolean,
  IsIn,
  Matches,
  IsDateString,
} from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';
import { SignerRole } from '../entities/signer.entity';

export class CreateSignerDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Jane Doe' })
  readonly name!: string;

  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'jane.doe@acme.com' })
  readonly email!: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  @IsCpf({ message: 'CPF is invalid' })
  @ApiPropertyOptional({ example: '123.456.789-00' })
  readonly cpf?: string;

  @IsOptional()
  @IsDateString()
  @ApiPropertyOptional({ example: '1990-01-15' })
  readonly birthDate?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?\d[\d\s()-]{7,18}$/, { message: 'Phone must be in a valid format' })
  @ApiPropertyOptional({ example: '+5511999998888' })
  readonly phone?: string;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  readonly requestEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  readonly requestCpf?: boolean;

  @IsOptional()
  @IsBoolean()
  @ApiPropertyOptional({ example: false })
  readonly requestPhone?: boolean;

  @IsOptional()
  @IsString()
  @IsIn(['email', 'none'])
  @ApiPropertyOptional({ example: 'email' })
  readonly authMethod?: string;

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
}

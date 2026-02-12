import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsString, Matches, MaxLength } from 'class-validator';
import { IsCpf } from '../../../common/validators/cpf.validator';

export class IdentifySignerDto {
  @IsOptional()
  @IsEmail()
  @MaxLength(255)
  @ApiPropertyOptional({ example: 'signer@example.com' })
  readonly email?: string;

  @IsOptional()
  @IsString()
  @MaxLength(14)
  @IsCpf({ message: 'CPF is invalid' })
  @ApiPropertyOptional({ example: '123.456.789-00' })
  readonly cpf?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  @Matches(/^\+?\d[\d\s()-]{7,18}$/, { message: 'Phone must be in a valid format' })
  @ApiPropertyOptional({ example: '+5511999998888' })
  readonly phone?: string;
}

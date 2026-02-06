import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsString, MinLength } from 'class-validator';

export class LoginDto {
  @IsEmail()
  @ApiProperty({ example: 'admin@acme.com' })
  readonly email!: string;

  @IsString()
  @MinLength(1)
  @ApiProperty({ example: 'strong-password' })
  readonly password!: string;

  @IsString()
  @ApiProperty({ example: 'f4c2b2b0-8a75-4c6d-8a0a-9b2f5e3b2f9a' })
  readonly tenantId!: string;
}

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
}

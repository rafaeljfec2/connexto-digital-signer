import { ApiProperty } from '@nestjs/swagger';
import { IsEmail } from 'class-validator';

export class CheckEmailDto {
  @IsEmail()
  @ApiProperty({ example: 'admin@acme.com' })
  readonly email!: string;
}

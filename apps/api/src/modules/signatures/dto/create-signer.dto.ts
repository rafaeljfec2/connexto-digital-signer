import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsEmail, MaxLength } from 'class-validator';

export class CreateSignerDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Jane Doe' })
  readonly name!: string;

  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'jane.doe@acme.com' })
  readonly email!: string;
}

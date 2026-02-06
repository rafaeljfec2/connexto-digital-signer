import { IsString, IsEmail, MaxLength } from 'class-validator';

export class CreateSignerDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsEmail()
  @MaxLength(255)
  email!: string;
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsEmail, MaxLength, IsInt, IsOptional, Min } from 'class-validator';

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
  @IsInt()
  @Min(1)
  @ApiPropertyOptional({ example: 1 })
  readonly order?: number;
}

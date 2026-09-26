import { ApiProperty } from '@nestjs/swagger';
import { IsString, MaxLength } from 'class-validator';

export class CreateDraftDto {
  @IsString()
  @MaxLength(500)
  @ApiProperty({ example: 'New document' })
  readonly title!: string;
}

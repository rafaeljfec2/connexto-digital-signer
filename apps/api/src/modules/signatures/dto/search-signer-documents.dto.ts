import { IsString, MaxLength, MinLength } from 'class-validator';

export class SearchSignerDocumentsDto {
  @IsString()
  @MinLength(3)
  @MaxLength(100)
  readonly q!: string;
}

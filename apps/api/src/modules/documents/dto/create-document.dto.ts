import { IsString, IsOptional, IsDateString, MaxLength } from 'class-validator';

export class CreateDocumentDto {
  @IsString()
  @MaxLength(500)
  title!: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}

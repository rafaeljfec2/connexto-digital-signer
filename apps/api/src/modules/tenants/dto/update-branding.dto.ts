import { IsOptional, IsString, MaxLength, Matches } from 'class-validator';

export class UpdateBrandingDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  name?: string;

  @IsOptional()
  @IsString()
  @MaxLength(7)
  @Matches(/^#[\dA-Fa-f]{6}$/, { message: 'primaryColor must be a valid hex color (e.g. #FF0000)' })
  primaryColor?: string;
}

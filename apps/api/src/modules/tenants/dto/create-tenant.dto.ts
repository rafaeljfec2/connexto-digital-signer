import { IsString, IsOptional, IsObject, MaxLength } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(255)
  name!: string;

  @IsString()
  @MaxLength(100)
  slug!: string;

  @IsOptional()
  @IsObject()
  branding?: { name?: string; primaryColor?: string; logoUrl?: string };

  @IsOptional()
  @IsObject()
  legalTexts?: { termsOfService?: string; privacyPolicy?: string };

  @IsOptional()
  @IsObject()
  usageLimits?: { documentsPerMonth?: number; signersPerDocument?: number };
}

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsString, IsOptional, IsObject, MaxLength, Matches } from 'class-validator';

export class CreateTenantDto {
  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Acme Corp' })
  readonly name!: string;

  @IsString()
  @MaxLength(100)
  @Matches(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
  @ApiProperty({ example: 'acme' })
  readonly slug!: string;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'Owner Name' })
  readonly ownerName!: string;

  @IsEmail()
  @MaxLength(255)
  @ApiProperty({ example: 'owner@acme.com' })
  readonly ownerEmail!: string;

  @IsString()
  @MaxLength(255)
  @ApiProperty({ example: 'strong-password' })
  readonly ownerPassword!: string;

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    example: { name: 'Acme', primaryColor: '#1E88E5', logoUrl: 'https://cdn.acme.com/logo.png' },
  })
  readonly branding?: { name?: string; primaryColor?: string; logoUrl?: string };

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    example: { termsOfService: '...', privacyPolicy: '...' },
  })
  readonly legalTexts?: { termsOfService?: string; privacyPolicy?: string };

  @IsOptional()
  @IsObject()
  @ApiPropertyOptional({
    type: 'object',
    example: { documentsPerMonth: 1000, signersPerDocument: 10 },
  })
  readonly usageLimits?: { documentsPerMonth?: number; signersPerDocument?: number };
}

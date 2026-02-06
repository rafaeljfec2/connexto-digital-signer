import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface TenantBranding {
  name?: string;
  primaryColor?: string;
  logoUrl?: string;
}

export interface TenantLegalTexts {
  termsOfService?: string;
  privacyPolicy?: string;
}

export interface TenantUsageLimits {
  documentsPerMonth?: number;
  signersPerDocument?: number;
}

@Entity('tenants')
@Index(['apiKeyHash', 'isActive'])
export class Tenant {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 100, unique: true })
  slug!: string;

  @Column({ type: 'jsonb', nullable: true })
  branding!: TenantBranding | null;

  @Column({ type: 'jsonb', nullable: true })
  legalTexts!: TenantLegalTexts | null;

  @Column({ type: 'jsonb', nullable: true })
  usageLimits!: TenantUsageLimits | null;

  @Column({ name: 'api_key_hash', type: 'varchar', length: 255, nullable: true })
  apiKeyHash!: string | null;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

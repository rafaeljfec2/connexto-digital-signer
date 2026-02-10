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

  @Column({ name: 'default_signing_language', type: 'varchar', length: 10, default: "'pt-br'" })
  defaultSigningLanguage!: string;

  @Column({ name: 'default_reminder_interval', type: 'varchar', length: 20, default: "'none'" })
  defaultReminderInterval!: string;

  @Column({ name: 'default_closure_mode', type: 'varchar', length: 20, default: "'automatic'" })
  defaultClosureMode!: string;

  @Column({ name: 'email_sender_name', type: 'varchar', length: 255, nullable: true })
  emailSenderName!: string | null;

  @Column({ name: 'api_key_last_four', type: 'varchar', length: 4, nullable: true })
  apiKeyLastFour!: string | null;

  @Column({ name: 'certificate_file_key', type: 'varchar', length: 512, nullable: true })
  certificateFileKey!: string | null;

  @Column({ name: 'certificate_password_enc', type: 'text', nullable: true })
  certificatePasswordEnc!: string | null;

  @Column({ name: 'certificate_subject', type: 'varchar', length: 512, nullable: true })
  certificateSubject!: string | null;

  @Column({ name: 'certificate_issuer', type: 'varchar', length: 512, nullable: true })
  certificateIssuer!: string | null;

  @Column({ name: 'certificate_expires_at', type: 'timestamptz', nullable: true })
  certificateExpiresAt!: Date | null;

  @Column({ name: 'certificate_configured_at', type: 'timestamptz', nullable: true })
  certificateConfiguredAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

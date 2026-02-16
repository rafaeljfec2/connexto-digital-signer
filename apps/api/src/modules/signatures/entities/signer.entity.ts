import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SignerStatus {
  PENDING = 'pending',
  SIGNED = 'signed',
}

export enum SignerRole {
  SIGNER = 'signer',
  WITNESS = 'witness',
  APPROVER = 'approver',
  PARTY = 'party',
  INTERVENING = 'intervening',
  GUARANTOR = 'guarantor',
  ENDORSER = 'endorser',
  LEGAL_REPRESENTATIVE = 'legal_representative',
  ATTORNEY = 'attorney',
}

@Entity('signers')
@Index(['tenantId', 'envelopeId'])
export class Signer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'envelope_id', type: 'uuid' })
  envelopeId!: string;

  @Column({ name: 'tenant_signer_id', type: 'uuid', nullable: true })
  tenantSignerId!: string | null;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ type: 'varchar', length: 255 })
  email!: string;

  @Column({
    type: 'enum',
    enum: SignerStatus,
    default: SignerStatus.PENDING,
  })
  status!: SignerStatus;

  @Column({ name: 'access_token', type: 'varchar', length: 64, unique: true })
  accessToken!: string;

  @Column({ type: 'varchar', length: 14, nullable: true })
  cpf!: string | null;

  @Column({ name: 'birth_date', type: 'date', nullable: true })
  birthDate!: string | null;

  @Column({ type: 'varchar', length: 20, nullable: true })
  phone!: string | null;

  @Column({ name: 'request_email', type: 'boolean', default: false })
  requestEmail!: boolean;

  @Column({ name: 'request_cpf', type: 'boolean', default: false })
  requestCpf!: boolean;

  @Column({ name: 'request_phone', type: 'boolean', default: false })
  requestPhone!: boolean;

  @Column({ name: 'auth_method', type: 'varchar', length: 50, default: 'email' })
  authMethod!: string;

  @Column({ type: 'varchar', length: 30, default: SignerRole.SIGNER })
  role!: SignerRole;

  @Column({ name: 'order', type: 'int', nullable: true })
  order!: number | null;

  @Column({ name: 'reminder_count', type: 'int', default: 0 })
  reminderCount!: number;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @Column({ name: 'viewed_at', type: 'timestamptz', nullable: true })
  viewedAt!: Date | null;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @Column({ name: 'verification_code', type: 'varchar', length: 128, nullable: true })
  verificationCode!: string | null;

  @Column({ name: 'verification_expires_at', type: 'timestamptz', nullable: true })
  verificationExpiresAt!: Date | null;

  @Column({ name: 'verification_attempts', type: 'int', default: 0 })
  verificationAttempts!: number;

  @Column({ name: 'verified_at', type: 'timestamptz', nullable: true })
  verifiedAt!: Date | null;

  @Column({ name: 'signature_data', type: 'text', nullable: true })
  signatureData!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

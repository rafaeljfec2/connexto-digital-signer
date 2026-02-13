import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum EnvelopeStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURES = 'pending_signatures',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum SigningMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
}

@Entity('envelopes')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
@Index(['folderId'])
export class Envelope {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'folder_id', type: 'uuid' })
  folderId!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({
    type: 'enum',
    enum: EnvelopeStatus,
    default: EnvelopeStatus.DRAFT,
  })
  status!: EnvelopeStatus;

  @Column({
    name: 'signing_mode',
    type: 'enum',
    enum: SigningMode,
    default: SigningMode.PARALLEL,
  })
  signingMode!: SigningMode;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'reminder_interval', type: 'varchar', length: 20, default: 'none' })
  reminderInterval!: string;

  @Column({ name: 'signing_language', type: 'varchar', length: 10, default: 'pt-br' })
  signingLanguage!: string;

  @Column({ name: 'closure_mode', type: 'varchar', length: 20, default: 'automatic' })
  closureMode!: string;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

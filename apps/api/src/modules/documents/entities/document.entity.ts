import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum DocumentStatus {
  DRAFT = 'draft',
  PENDING_SIGNATURES = 'pending_signatures',
  COMPLETED = 'completed',
  EXPIRED = 'expired',
}

export enum SigningMode {
  PARALLEL = 'parallel',
  SEQUENTIAL = 'sequential',
}

@Entity('documents')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
@Index(['tenantId', 'expiresAt'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 500 })
  title!: string;

  @Column({ name: 'original_file_key', type: 'varchar', length: 512, nullable: true })
  originalFileKey!: string | null;

  @Column({ name: 'final_file_key', type: 'varchar', length: 512, nullable: true })
  finalFileKey!: string | null;

  @Column({ name: 'original_hash', type: 'varchar', length: 64, nullable: true })
  originalHash!: string | null;

  @Column({ name: 'final_hash', type: 'varchar', length: 64, nullable: true })
  finalHash!: string | null;

  @Column({
    type: 'enum',
    enum: DocumentStatus,
    default: DocumentStatus.DRAFT,
  })
  status!: DocumentStatus;

  @Column({
    name: 'signing_mode',
    type: 'enum',
    enum: SigningMode,
    default: SigningMode.PARALLEL,
  })
  signingMode!: SigningMode;

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ type: 'int', default: 1 })
  version!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

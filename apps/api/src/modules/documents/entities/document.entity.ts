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

@Entity('documents')
@Index(['tenantId'])
@Index(['tenantId', 'status'])
@Index(['envelopeId'])
export class Document {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'envelope_id', type: 'uuid' })
  envelopeId!: string;

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

  @Column({ type: 'int', default: 1 })
  version!: number;

  @Column({ type: 'int', default: 0 })
  position!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

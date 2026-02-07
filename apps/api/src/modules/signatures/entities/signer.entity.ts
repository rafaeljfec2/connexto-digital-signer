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

@Entity('signers')
@Index(['tenantId', 'documentId'])
export class Signer {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'document_id', type: 'varchar', length: 255 })
  documentId!: string;

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

  @Column({ name: 'request_cpf', type: 'boolean', default: false })
  requestCpf!: boolean;

  @Column({ name: 'auth_method', type: 'varchar', length: 50, default: 'email' })
  authMethod!: string;

  @Column({ name: 'order', type: 'int', nullable: true })
  order!: number | null;

  @Column({ name: 'notified_at', type: 'timestamptz', nullable: true })
  notifiedAt!: Date | null;

  @Column({ name: 'signed_at', type: 'timestamptz', nullable: true })
  signedAt!: Date | null;

  @Column({ name: 'ip_address', type: 'varchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Column({ name: 'user_agent', type: 'text', nullable: true })
  userAgent!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

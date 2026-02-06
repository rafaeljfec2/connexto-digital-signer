import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export enum SignatureFieldType {
  SIGNATURE = 'signature',
  NAME = 'name',
  DATE = 'date',
  INITIALS = 'initials',
  TEXT = 'text',
}

@Entity('signature_fields')
@Index(['tenantId'])
@Index(['documentId'])
@Index(['signerId'])
export class SignatureField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'document_id', type: 'uuid' })
  documentId!: string;

  @Column({ name: 'signer_id', type: 'uuid' })
  signerId!: string;

  @Column({
    type: 'enum',
    enum: SignatureFieldType,
  })
  type!: SignatureFieldType;

  @Column({ type: 'int' })
  page!: number;

  @Column({ type: 'double precision' })
  x!: number;

  @Column({ type: 'double precision' })
  y!: number;

  @Column({ type: 'double precision' })
  width!: number;

  @Column({ type: 'double precision' })
  height!: number;

  @Column({ type: 'boolean', default: true })
  required!: boolean;

  @Column({ type: 'text', nullable: true })
  value!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SignerRole } from '../../signatures/entities/signer.entity';

@Entity('template_signers')
@Index(['templateId'])
export class TemplateSigner {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({ type: 'varchar', length: 30, default: SignerRole.SIGNER })
  role!: SignerRole;

  @Column({ name: 'order', type: 'int', nullable: true })
  order!: number | null;

  @Column({ name: 'auth_method', type: 'varchar', length: 50, default: 'email' })
  authMethod!: string;

  @Column({ name: 'request_email', type: 'boolean', default: false })
  requestEmail!: boolean;

  @Column({ name: 'request_cpf', type: 'boolean', default: false })
  requestCpf!: boolean;

  @Column({ name: 'request_phone', type: 'boolean', default: false })
  requestPhone!: boolean;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { SigningMode } from '../../envelopes/entities/envelope.entity';

@Entity('templates')
@Index(['tenantId'])
@Index(['tenantId', 'isActive'])
export class Template {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 500 })
  name!: string;

  @Column({ type: 'text', nullable: true })
  description!: string | null;

  @Column({ type: 'varchar', length: 100, nullable: true })
  category!: string | null;

  @Column({
    name: 'signing_mode',
    type: 'enum',
    enum: SigningMode,
    default: SigningMode.PARALLEL,
  })
  signingMode!: SigningMode;

  @Column({ name: 'signing_language', type: 'varchar', length: 10, default: 'pt-br' })
  signingLanguage!: string;

  @Column({ name: 'reminder_interval', type: 'varchar', length: 20, default: 'none' })
  reminderInterval!: string;

  @Column({ name: 'closure_mode', type: 'varchar', length: 20, default: 'automatic' })
  closureMode!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'usage_count', type: 'int', default: 0 })
  usageCount!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

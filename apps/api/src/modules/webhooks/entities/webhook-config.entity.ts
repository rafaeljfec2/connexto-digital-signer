import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';

export interface WebhookRetryConfig {
  maxAttempts?: number;
  initialDelayMs?: number;
  backoffMultiplier?: number;
}

@Entity('webhook_configs')
@Index(['tenantId', 'isActive'])
export class WebhookConfig {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ type: 'varchar', length: 2048 })
  url!: string;

  @Column({ name: 'secret', type: 'varchar', length: 255 })
  secret!: string;

  @Column({ type: 'simple-array' })
  events!: string[];

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'retry_config', type: 'jsonb', nullable: true })
  retryConfig!: WebhookRetryConfig | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt!: Date;
}

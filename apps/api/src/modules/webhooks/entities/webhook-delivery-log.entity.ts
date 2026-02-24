import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('webhook_delivery_logs')
@Index(['webhookConfigId', 'createdAt'])
export class WebhookDeliveryLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'webhook_config_id', type: 'uuid' })
  webhookConfigId!: string;

  @Column({ type: 'varchar', length: 100 })
  event!: string;

  @Column({ type: 'jsonb' })
  payload!: object;

  @Column({ name: 'status_code', type: 'int', nullable: true })
  statusCode!: number | null;

  @Column({ name: 'response_body', type: 'text', nullable: true })
  responseBody!: string | null;

  @Column({ type: 'int' })
  duration!: number;

  @Column({ type: 'boolean' })
  success!: boolean;

  @Column({ type: 'text', nullable: true })
  error!: string | null;

  @Column({ name: 'attempt_number', type: 'int', default: 1 })
  attemptNumber!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

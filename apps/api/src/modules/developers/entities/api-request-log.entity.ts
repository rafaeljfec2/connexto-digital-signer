import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

@Entity('api_request_logs')
@Index(['tenantId', 'createdAt'])
export class ApiRequestLog {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ name: 'api_key_id', type: 'uuid', nullable: true })
  apiKeyId!: string | null;

  @Column({ type: 'varchar', length: 10 })
  method!: string;

  @Column({ type: 'varchar', length: 2048 })
  path!: string;

  @Column({ name: 'status_code', type: 'int' })
  statusCode!: number;

  @Column({ type: 'int' })
  duration!: number;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip!: string | null;

  @Column({ name: 'user_agent', type: 'varchar', length: 512, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'response_size', type: 'int', default: 0 })
  responseSize!: number;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

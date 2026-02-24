import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export type ApiKeyScope =
  | 'documents:read'
  | 'documents:write'
  | 'webhooks:manage'
  | 'templates:read'
  | 'templates:write'
  | 'signers:manage'
  | 'envelopes:read'
  | 'envelopes:write';

export const ALL_API_KEY_SCOPES: ReadonlyArray<ApiKeyScope> = [
  'documents:read',
  'documents:write',
  'webhooks:manage',
  'templates:read',
  'templates:write',
  'signers:manage',
  'envelopes:read',
  'envelopes:write',
];

@Entity('api_keys')
@Index(['keyHash', 'isActive'])
@Index(['tenantId', 'isActive'])
export class ApiKey {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'uuid' })
  tenantId!: string;

  @Column({ type: 'varchar', length: 255 })
  name!: string;

  @Column({ name: 'key_hash', type: 'varchar', length: 255 })
  keyHash!: string;

  @Column({ name: 'key_prefix', type: 'varchar', length: 20, default: "'sk_live_'" })
  keyPrefix!: string;

  @Column({ name: 'key_last_four', type: 'varchar', length: 4 })
  keyLastFour!: string;

  @Column({ type: 'simple-array' })
  scopes!: string[];

  @Column({ name: 'expires_at', type: 'timestamptz', nullable: true })
  expiresAt!: Date | null;

  @Column({ name: 'last_used_at', type: 'timestamptz', nullable: true })
  lastUsedAt!: Date | null;

  @Column({ name: 'total_requests', type: 'int', default: 0 })
  totalRequests!: number;

  @Column({ name: 'is_active', default: true })
  isActive!: boolean;

  @Column({ name: 'revoked_at', type: 'timestamptz', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

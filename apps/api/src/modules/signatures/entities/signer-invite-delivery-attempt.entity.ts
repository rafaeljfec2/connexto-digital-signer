import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryGeneratedColumn,
} from 'typeorm';
import {
  InviteDeliveryStatus,
  InviteDeliveryTrigger,
} from '../interfaces/invite-delivery.interface';

@Entity('signer_invite_delivery_attempts')
@Index(['tenantId', 'envelopeId'])
@Index(['signerId', 'attemptNumber'])
export class SignerInviteDeliveryAttempt {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'tenant_id', type: 'varchar', length: 255 })
  tenantId!: string;

  @Column({ name: 'envelope_id', type: 'uuid' })
  envelopeId!: string;

  @Column({ name: 'signer_id', type: 'uuid' })
  signerId!: string;

  @Column({ name: 'attempt_number', type: 'int' })
  attemptNumber!: number;

  @Column({
    type: 'enum',
    enum: InviteDeliveryTrigger,
  })
  trigger!: InviteDeliveryTrigger;

  @Column({
    type: 'enum',
    enum: InviteDeliveryStatus,
  })
  status!: InviteDeliveryStatus;

  @Column({ name: 'started_at', type: 'timestamptz' })
  startedAt!: Date;

  @Column({ name: 'finished_at', type: 'timestamptz', nullable: true })
  finishedAt!: Date | null;

  @Column({ name: 'error_message', type: 'text', nullable: true })
  errorMessage!: string | null;

  @Column({ name: 'provider_message_id', type: 'varchar', length: 255, nullable: true })
  providerMessageId!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

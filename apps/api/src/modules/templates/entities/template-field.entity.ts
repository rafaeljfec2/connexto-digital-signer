import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';
import { SignatureFieldType } from '../../signatures/entities/signature-field.entity';

@Entity('template_fields')
@Index(['templateDocumentId'])
@Index(['templateSignerId'])
export class TemplateField {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_document_id', type: 'uuid' })
  templateDocumentId!: string;

  @Column({ name: 'template_signer_id', type: 'uuid' })
  templateSignerId!: string;

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

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

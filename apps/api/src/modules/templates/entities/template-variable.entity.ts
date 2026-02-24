import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  Index,
} from 'typeorm';

export enum TemplateVariableType {
  TEXT = 'text',
  DATE = 'date',
  NUMBER = 'number',
}

@Entity('template_variables')
@Index(['templateId'])
export class TemplateVariable {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ name: 'template_id', type: 'uuid' })
  templateId!: string;

  @Column({ type: 'varchar', length: 100 })
  key!: string;

  @Column({ type: 'varchar', length: 255 })
  label!: string;

  @Column({
    type: 'enum',
    enum: TemplateVariableType,
    default: TemplateVariableType.TEXT,
  })
  type!: TemplateVariableType;

  @Column({ type: 'boolean', default: true })
  required!: boolean;

  @Column({ name: 'default_value', type: 'varchar', length: 500, nullable: true })
  defaultValue!: string | null;

  @CreateDateColumn({ name: 'created_at' })
  createdAt!: Date;
}

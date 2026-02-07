import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SignatureField } from '../entities/signature-field.entity';
import { CreateSignatureFieldDto } from '../dto/create-signature-field.dto';
import { UpdateSignatureFieldDto } from '../dto/update-signature-field.dto';
import { BatchUpdateFieldsDto } from '../dto/batch-update-fields.dto';

@Injectable()
export class SignatureFieldsService {
  constructor(
    @InjectRepository(SignatureField)
    private readonly fieldRepository: Repository<SignatureField>
  ) {}

  async create(
    tenantId: string,
    documentId: string,
    dto: CreateSignatureFieldDto
  ): Promise<SignatureField> {
    const field = this.fieldRepository.create({
      ...dto,
      tenantId,
      documentId,
    });
    return this.fieldRepository.save(field);
  }

  async findByDocument(
    tenantId: string,
    documentId: string
  ): Promise<SignatureField[]> {
    return this.fieldRepository.find({
      where: { tenantId, documentId },
      order: { createdAt: 'ASC' },
    });
  }

  async update(
    tenantId: string,
    documentId: string,
    fieldId: string,
    dto: UpdateSignatureFieldDto
  ): Promise<SignatureField> {
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId, tenantId, documentId },
    });
    if (field === null) {
      throw new NotFoundException('Signature field not found');
    }
    Object.assign(field, dto);
    return this.fieldRepository.save(field);
  }

  async remove(
    tenantId: string,
    documentId: string,
    fieldId: string
  ): Promise<void> {
    const result = await this.fieldRepository.delete({
      id: fieldId,
      tenantId,
      documentId,
    });
    if (result.affected === 0) {
      throw new NotFoundException('Signature field not found');
    }
  }

  async findBySigner(
    tenantId: string,
    documentId: string,
    signerId: string
  ): Promise<SignatureField[]> {
    return this.fieldRepository.find({
      where: { tenantId, documentId, signerId },
      order: { createdAt: 'ASC' },
    });
  }

  async updateValue(
    tenantId: string,
    documentId: string,
    fieldId: string,
    value: string
  ): Promise<SignatureField> {
    const field = await this.fieldRepository.findOne({
      where: { id: fieldId, tenantId, documentId },
    });
    if (field === null) {
      throw new NotFoundException('Signature field not found');
    }
    field.value = value;
    return this.fieldRepository.save(field);
  }

  async replaceAll(
    tenantId: string,
    documentId: string,
    dto: BatchUpdateFieldsDto
  ): Promise<SignatureField[]> {
    await this.fieldRepository.delete({ tenantId, documentId });
    if (dto.fields.length === 0) return [];
    const fields = dto.fields.map((field) =>
      this.fieldRepository.create({
        ...field,
        required: field.required ?? true,
        tenantId,
        documentId,
      })
    );
    return this.fieldRepository.save(fields);
  }
}

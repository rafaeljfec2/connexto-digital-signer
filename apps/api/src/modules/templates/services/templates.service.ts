import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Repository } from 'typeorm';
import { randomUUID } from 'node:crypto';
import { Template } from '../entities/template.entity';
import { TemplateDocument } from '../entities/template-document.entity';
import { TemplateSigner } from '../entities/template-signer.entity';
import { TemplateField } from '../entities/template-field.entity';
import { TemplateVariable } from '../entities/template-variable.entity';
import { CreateTemplateDto } from '../dto/create-template.dto';
import { UpdateTemplateDto } from '../dto/update-template.dto';
import { ListTemplatesQueryDto } from '../dto/list-templates-query.dto';
import { AddTemplateDocumentDto } from '../dto/add-template-document.dto';
import { AddTemplateSignerDto } from '../dto/add-template-signer.dto';
import { UpdateTemplateSignerDto } from '../dto/update-template-signer.dto';
import { BatchUpdateTemplateFieldsDto } from '../dto/batch-update-template-fields.dto';
import { BatchUpdateTemplateVariablesDto } from '../dto/batch-update-template-variables.dto';
import { CreateEnvelopeFromTemplateDto } from '../dto/create-envelope-from-template.dto';
import { CreateTemplateFromEnvelopeDto } from '../dto/create-template-from-envelope.dto';
import { resolveVariables, validateRequiredVariables } from './variable-resolver';
import { S3StorageService } from '../../../shared/storage/s3-storage.service';
import { validateFile } from '../../../shared/storage/file-validator';
import { sha256 } from '@connexto/shared';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { SignaturesService } from '../../signatures/services/signatures.service';
import { SignatureFieldsService } from '../../signatures/services/signature-fields.service';
import {
  EVENT_TEMPLATE_CREATED,
  EVENT_TEMPLATE_USED,
} from '@connexto/events';
import type {
  TemplateCreatedEvent,
  TemplateUsedEvent,
} from '@connexto/events';

export interface TemplateDetail extends Template {
  readonly documents: TemplateDocument[];
  readonly signers: TemplateSigner[];
  readonly fields: TemplateField[];
  readonly variables: TemplateVariable[];
}

@Injectable()
export class TemplatesService {
  private readonly logger = new Logger(TemplatesService.name);

  constructor(
    @InjectRepository(Template)
    private readonly templateRepository: Repository<Template>,
    @InjectRepository(TemplateDocument)
    private readonly templateDocumentRepository: Repository<TemplateDocument>,
    @InjectRepository(TemplateSigner)
    private readonly templateSignerRepository: Repository<TemplateSigner>,
    @InjectRepository(TemplateField)
    private readonly templateFieldRepository: Repository<TemplateField>,
    @InjectRepository(TemplateVariable)
    private readonly templateVariableRepository: Repository<TemplateVariable>,
    private readonly storage: S3StorageService,
    private readonly documentsService: DocumentsService,
    private readonly envelopesService: EnvelopesService,
    private readonly signaturesService: SignaturesService,
    private readonly fieldsService: SignatureFieldsService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async create(tenantId: string, dto: CreateTemplateDto): Promise<Template> {
    const template = this.templateRepository.create({
      tenantId,
      name: dto.name,
      description: dto.description ?? null,
      category: dto.category ?? null,
      signingMode: dto.signingMode,
      signingLanguage: dto.signingLanguage ?? 'pt-br',
      reminderInterval: dto.reminderInterval ?? 'none',
      closureMode: dto.closureMode ?? 'automatic',
    });

    const saved = await this.templateRepository.save(template);

    this.eventEmitter.emit(EVENT_TEMPLATE_CREATED, {
      templateId: saved.id,
      tenantId,
      name: saved.name,
      createdAt: saved.createdAt,
    } satisfies TemplateCreatedEvent);

    return saved;
  }

  async findOne(id: string, tenantId: string): Promise<Template> {
    const template = await this.templateRepository.findOne({
      where: { id, tenantId },
    });
    if (template === null) {
      throw new NotFoundException(`Template ${id} not found`);
    }
    return template;
  }

  async findOneDetail(id: string, tenantId: string): Promise<TemplateDetail> {
    const template = await this.findOne(id, tenantId);

    const [documents, signers, variables] = await Promise.all([
      this.templateDocumentRepository.find({
        where: { templateId: id },
        order: { position: 'ASC' },
      }),
      this.templateSignerRepository.find({
        where: { templateId: id },
        order: { order: 'ASC' },
      }),
      this.templateVariableRepository.find({
        where: { templateId: id },
        order: { key: 'ASC' },
      }),
    ]);

    const documentIds = documents.map((d) => d.id);
    const fields =
      documentIds.length > 0
        ? await this.templateFieldRepository
            .createQueryBuilder('field')
            .where('field.templateDocumentId IN (:...documentIds)', { documentIds })
            .getMany()
        : [];

    return { ...template, documents, signers, fields, variables };
  }

  async findAll(
    tenantId: string,
    query: ListTemplatesQueryDto,
  ): Promise<{
    data: (Template & { documentCount: number; signerCount: number })[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const qb = this.templateRepository
      .createQueryBuilder('template')
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from('template_documents', 'td')
            .where('td.template_id = template.id'),
        'documentCount',
      )
      .addSelect(
        (sub) =>
          sub
            .select('COUNT(*)')
            .from('template_signers', 'ts')
            .where('ts.template_id = template.id'),
        'signerCount',
      )
      .where('template.tenantId = :tenantId', { tenantId });

    if (query.isActive !== undefined) {
      qb.andWhere('template.isActive = :isActive', { isActive: query.isActive });
    }
    if (query.category) {
      qb.andWhere('template.category = :category', { category: query.category });
    }
    if (query.search) {
      qb.andWhere('template.name ILIKE :search', { search: `%${query.search}%` });
    }

    const total = await qb.getCount();

    const rawResults = await qb
      .orderBy('template.updatedAt', 'DESC')
      .take(limit)
      .skip(skip)
      .getRawAndEntities();

    const data = rawResults.entities.map((t, index) => ({
      ...t,
      documentCount: Number(rawResults.raw[index]?.documentCount ?? 0),
      signerCount: Number(rawResults.raw[index]?.signerCount ?? 0),
    }));

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async update(id: string, tenantId: string, dto: UpdateTemplateDto): Promise<Template> {
    const template = await this.findOne(id, tenantId);

    if (dto.name !== undefined) template.name = dto.name;
    if (dto.description !== undefined) template.description = dto.description ?? null;
    if (dto.category !== undefined) template.category = dto.category ?? null;
    if (dto.signingMode !== undefined) template.signingMode = dto.signingMode;
    if (dto.signingLanguage !== undefined) template.signingLanguage = dto.signingLanguage;
    if (dto.reminderInterval !== undefined) template.reminderInterval = dto.reminderInterval;
    if (dto.closureMode !== undefined) template.closureMode = dto.closureMode;
    if (dto.isActive !== undefined) template.isActive = dto.isActive;

    return this.templateRepository.save(template);
  }

  async remove(id: string, tenantId: string): Promise<void> {
    const template = await this.findOneDetail(id, tenantId);

    const deletePromises = template.documents.map((doc) =>
      this.storage.delete(doc.fileKey).catch((err) => {
        this.logger.warn(`Failed to delete template file ${doc.fileKey}: ${err}`);
      }),
    );
    await Promise.all(deletePromises);

    await this.templateRepository.remove(template);
  }

  async addDocument(
    templateId: string,
    tenantId: string,
    file: Buffer,
    dto: AddTemplateDocumentDto,
  ): Promise<TemplateDocument> {
    await this.findOne(templateId, tenantId);

    const validated = validateFile(file);
    const docId = randomUUID();
    const key = `tenants/${tenantId}/templates/${templateId}/${docId}/original.${validated.extension}`;

    await this.storage.put(key, file, validated.mimeType);

    const doc = this.templateDocumentRepository.create({
      templateId,
      title: dto.title,
      fileKey: key,
      mimeType: validated.mimeType,
      size: file.length,
      position: dto.position ?? 0,
    });

    return this.templateDocumentRepository.save(doc);
  }

  async removeDocument(templateId: string, docId: string, tenantId: string): Promise<void> {
    await this.findOne(templateId, tenantId);

    const doc = await this.templateDocumentRepository.findOne({
      where: { id: docId, templateId },
    });
    if (doc === null) {
      throw new NotFoundException(`Template document ${docId} not found`);
    }

    await this.storage.delete(doc.fileKey).catch((err) => {
      this.logger.warn(`Failed to delete template file ${doc.fileKey}: ${err}`);
    });

    await this.templateDocumentRepository.remove(doc);
  }

  async addSigner(
    templateId: string,
    tenantId: string,
    dto: AddTemplateSignerDto,
  ): Promise<TemplateSigner> {
    await this.findOne(templateId, tenantId);

    const existing = await this.templateSignerRepository.findOne({
      where: { templateId, label: dto.label },
    });
    if (existing) {
      throw new BadRequestException(`Signer slot "${dto.label}" already exists in this template`);
    }

    const signer = this.templateSignerRepository.create({
      templateId,
      ...dto,
    });
    return this.templateSignerRepository.save(signer);
  }

  async updateSigner(
    templateId: string,
    signerId: string,
    tenantId: string,
    dto: UpdateTemplateSignerDto,
  ): Promise<TemplateSigner> {
    await this.findOne(templateId, tenantId);

    const signer = await this.templateSignerRepository.findOne({
      where: { id: signerId, templateId },
    });
    if (signer === null) {
      throw new NotFoundException(`Template signer ${signerId} not found`);
    }

    if (dto.label !== undefined) signer.label = dto.label;
    if (dto.role !== undefined) signer.role = dto.role;
    if (dto.order !== undefined) signer.order = dto.order ?? null;
    if (dto.authMethod !== undefined) signer.authMethod = dto.authMethod;
    if (dto.requestEmail !== undefined) signer.requestEmail = dto.requestEmail;
    if (dto.requestCpf !== undefined) signer.requestCpf = dto.requestCpf;
    if (dto.requestPhone !== undefined) signer.requestPhone = dto.requestPhone;

    return this.templateSignerRepository.save(signer);
  }

  async removeSigner(templateId: string, signerId: string, tenantId: string): Promise<void> {
    await this.findOne(templateId, tenantId);

    const signer = await this.templateSignerRepository.findOne({
      where: { id: signerId, templateId },
    });
    if (signer === null) {
      throw new NotFoundException(`Template signer ${signerId} not found`);
    }

    await this.templateSignerRepository.remove(signer);
  }

  async replaceFields(
    templateId: string,
    docId: string,
    tenantId: string,
    dto: BatchUpdateTemplateFieldsDto,
  ): Promise<TemplateField[]> {
    await this.findOne(templateId, tenantId);

    const doc = await this.templateDocumentRepository.findOne({
      where: { id: docId, templateId },
    });
    if (doc === null) {
      throw new NotFoundException(`Template document ${docId} not found`);
    }

    await this.templateFieldRepository.delete({ templateDocumentId: docId });

    if (dto.fields.length === 0) return [];

    const fields = dto.fields.map((f) =>
      this.templateFieldRepository.create({
        templateDocumentId: docId,
        templateSignerId: f.templateSignerId,
        type: f.type,
        page: f.page,
        x: f.x,
        y: f.y,
        width: f.width,
        height: f.height,
        required: f.required ?? true,
      }),
    );

    return this.templateFieldRepository.save(fields);
  }

  async updateVariables(
    templateId: string,
    tenantId: string,
    dto: BatchUpdateTemplateVariablesDto,
  ): Promise<TemplateVariable[]> {
    await this.findOne(templateId, tenantId);

    await this.templateVariableRepository.delete({ templateId });

    if (dto.variables.length === 0) return [];

    const variables = dto.variables.map((v) =>
      this.templateVariableRepository.create({
        templateId,
        key: v.key,
        label: v.label,
        type: v.type,
        required: v.required ?? true,
        defaultValue: v.defaultValue ?? null,
      }),
    );

    return this.templateVariableRepository.save(variables);
  }

  async createFromEnvelope(
    tenantId: string,
    envelopeId: string,
    dto: CreateTemplateFromEnvelopeDto,
  ): Promise<TemplateDetail> {
    const envelope = await this.envelopesService.findOne(envelopeId, tenantId);
    const documents = await this.documentsService.findByEnvelope(envelopeId, tenantId);
    const signers = await this.signaturesService.findByEnvelope(envelopeId, tenantId);

    const template = await this.templateRepository.save(
      this.templateRepository.create({
        tenantId,
        name: dto.name,
        description: dto.description ?? null,
        category: dto.category ?? null,
        signingMode: envelope.signingMode,
        signingLanguage: envelope.signingLanguage,
        reminderInterval: envelope.reminderInterval,
        closureMode: envelope.closureMode,
      }),
    );

    const signerMap = new Map<string, TemplateSigner>();
    const templateSigners: TemplateSigner[] = [];
    for (const signer of signers) {
      const ts = await this.templateSignerRepository.save(
        this.templateSignerRepository.create({
          templateId: template.id,
          label: signer.name.toLowerCase().replaceAll(/\s+/g, '_'),
          role: signer.role,
          order: signer.order,
          authMethod: signer.authMethod,
          requestEmail: signer.requestEmail,
          requestCpf: signer.requestCpf,
          requestPhone: signer.requestPhone,
        }),
      );
      signerMap.set(signer.id, ts);
      templateSigners.push(ts);
    }

    const templateDocuments: TemplateDocument[] = [];
    const templateFields: TemplateField[] = [];

    for (const doc of documents) {
      if (doc.originalFileKey === null) continue;

      const docId = randomUUID();
      const extension = doc.mimeType?.split('/')[1] ?? 'pdf';
      const newKey = `tenants/${tenantId}/templates/${template.id}/${docId}/original.${extension}`;

      await this.storage.copy(doc.originalFileKey, newKey);

      const templateDoc = await this.templateDocumentRepository.save(
        this.templateDocumentRepository.create({
          templateId: template.id,
          title: doc.title,
          fileKey: newKey,
          mimeType: doc.mimeType ?? 'application/pdf',
          size: doc.size ?? 0,
          position: doc.position,
        }),
      );
      templateDocuments.push(templateDoc);

      const fields = await this.fieldsService.findByDocument(tenantId, doc.id);
      for (const field of fields) {
        const templateSigner = signerMap.get(field.signerId);
        if (!templateSigner) continue;

        const tf = await this.templateFieldRepository.save(
          this.templateFieldRepository.create({
            templateDocumentId: templateDoc.id,
            templateSignerId: templateSigner.id,
            type: field.type,
            page: field.page,
            x: field.x,
            y: field.y,
            width: field.width,
            height: field.height,
            required: field.required,
          }),
        );
        templateFields.push(tf);
      }
    }

    this.eventEmitter.emit(EVENT_TEMPLATE_CREATED, {
      templateId: template.id,
      tenantId,
      name: template.name,
      createdAt: template.createdAt,
    } satisfies TemplateCreatedEvent);

    return {
      ...template,
      documents: templateDocuments,
      signers: templateSigners,
      fields: templateFields,
      variables: [],
    };
  }

  async createEnvelopeFromTemplate(
    templateId: string,
    tenantId: string,
    dto: CreateEnvelopeFromTemplateDto,
  ): Promise<{ envelopeId: string; sent: boolean }> {
    const detail = await this.findOneDetail(templateId, tenantId);

    this.validateTemplateHasContent(detail);

    const slotMap = this.validateSignerAssignments(detail, dto);

    validateRequiredVariables(detail.variables, dto.variables ?? {});

    const variableValues = this.buildVariableValues(detail.variables, dto.variables);

    const envelopeTitle = dto.title
      ? resolveVariables(dto.title, variableValues)
      : resolveVariables(detail.name, variableValues);

    const envelope = await this.envelopesService.create(tenantId, {
      title: envelopeTitle,
      folderId: dto.folderId,
      signingMode: detail.signingMode,
      signingLanguage: detail.signingLanguage,
      reminderInterval: detail.reminderInterval,
      closureMode: detail.closureMode,
    });

    const signerIdMap = await this.createSignersFromSlots(tenantId, envelope.id, dto.signers, slotMap);
    const docIdMap = await this.createDocumentsFromTemplate(tenantId, envelope.id, detail.documents, variableValues);
    await this.createFieldsFromTemplate(tenantId, detail.fields, signerIdMap, docIdMap);

    await this.templateRepository.increment({ id: templateId }, 'usageCount', 1);

    const sent = dto.autoSend
      ? (await this.signaturesService.sendEnvelope(tenantId, envelope.id, dto.message), true)
      : false;

    this.eventEmitter.emit(EVENT_TEMPLATE_USED, {
      templateId,
      tenantId,
      envelopeId: envelope.id,
      usedAt: new Date(),
    } satisfies TemplateUsedEvent);

    return { envelopeId: envelope.id, sent };
  }

  private validateTemplateHasContent(detail: TemplateDetail): void {
    if (detail.documents.length === 0) {
      throw new BadRequestException('Template has no documents');
    }
    if (detail.signers.length === 0) {
      throw new BadRequestException('Template has no signer slots');
    }
  }

  private validateSignerAssignments(
    detail: TemplateDetail,
    dto: CreateEnvelopeFromTemplateDto,
  ): Map<string, TemplateSigner> {
    const slotMap = new Map(detail.signers.map((s) => [s.label, s]));
    for (const assignment of dto.signers) {
      if (!slotMap.has(assignment.slotLabel)) {
        throw new BadRequestException(`Unknown signer slot: "${assignment.slotLabel}"`);
      }
    }
    for (const slot of detail.signers) {
      if (!dto.signers.some((a) => a.slotLabel === slot.label)) {
        throw new BadRequestException(`Signer slot "${slot.label}" is not assigned`);
      }
    }
    return slotMap;
  }

  private buildVariableValues(
    definitions: ReadonlyArray<TemplateVariable>,
    provided?: Record<string, string>,
  ): Record<string, string> {
    const values: Record<string, string> = {};
    for (const v of definitions) {
      values[v.key] = provided?.[v.key] ?? v.defaultValue ?? '';
    }
    return values;
  }

  private async createSignersFromSlots(
    tenantId: string,
    envelopeId: string,
    assignments: CreateEnvelopeFromTemplateDto['signers'],
    slotMap: Map<string, TemplateSigner>,
  ): Promise<Map<string, string>> {
    const signerIdMap = new Map<string, string>();
    for (const assignment of assignments) {
      const slot = slotMap.get(assignment.slotLabel)!;
      const signer = await this.signaturesService.addSigner(tenantId, envelopeId, {
        name: assignment.name,
        email: assignment.email,
        cpf: assignment.cpf,
        phone: assignment.phone,
        birthDate: assignment.birthDate,
        role: slot.role,
        order: slot.order ?? undefined,
        authMethod: slot.authMethod,
        requestEmail: slot.requestEmail,
        requestCpf: slot.requestCpf,
        requestPhone: slot.requestPhone,
      });
      signerIdMap.set(slot.id, signer.id);
    }
    return signerIdMap;
  }

  private async createDocumentsFromTemplate(
    tenantId: string,
    envelopeId: string,
    documents: ReadonlyArray<TemplateDocument>,
    variableValues: Record<string, string>,
  ): Promise<Map<string, string>> {
    const docIdMap = new Map<string, string>();
    for (const templateDoc of documents) {
      const docId = randomUUID();
      const extension = templateDoc.mimeType.split('/')[1] ?? 'pdf';
      const newKey = `tenants/${tenantId}/documents/${docId}/original.${extension}`;

      await this.storage.copy(templateDoc.fileKey, newKey);

      const fileBuffer = await this.storage.get(newKey);
      const hash = sha256(fileBuffer);
      const resolvedTitle = resolveVariables(templateDoc.title, variableValues);

      const document = await this.documentsService.createFromTemplate(tenantId, {
        id: docId,
        title: resolvedTitle,
        envelopeId,
        position: templateDoc.position,
        originalFileKey: newKey,
        originalHash: hash,
        mimeType: templateDoc.mimeType,
        size: templateDoc.size,
      });

      docIdMap.set(templateDoc.id, document.id);
    }
    return docIdMap;
  }

  private async createFieldsFromTemplate(
    tenantId: string,
    fields: ReadonlyArray<TemplateField>,
    signerIdMap: Map<string, string>,
    docIdMap: Map<string, string>,
  ): Promise<void> {
    for (const field of fields) {
      const realSignerId = signerIdMap.get(field.templateSignerId);
      const realDocId = docIdMap.get(field.templateDocumentId);
      if (!realSignerId || !realDocId) continue;

      await this.fieldsService.create(tenantId, realDocId, {
        signerId: realSignerId,
        type: field.type,
        page: field.page,
        x: field.x,
        y: field.y,
        width: field.width,
        height: field.height,
        required: field.required,
      });
    }
  }
}

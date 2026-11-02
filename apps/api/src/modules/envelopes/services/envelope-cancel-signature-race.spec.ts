import { ConflictException, BadRequestException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { EVENT_DOCUMENT_CANCELLED, EVENT_SIGNATURE_COMPLETED } from '@connexto/events';
import type { Repository } from 'typeorm';
import { Document, DocumentStatus } from '../../documents/entities/document.entity';
import { DocumentsService } from '../../documents/services/documents.service';
import { Envelope, EnvelopeStatus } from '../entities/envelope.entity';
import { EnvelopesService } from './envelopes.service';
import { FoldersService } from '../../folders/services/folders.service';
import { TenantsService } from '../../tenants/services/tenants.service';
import { SigningFlowService } from '../../signatures/services/signing-flow.service';
import { SignaturesService } from '../../signatures/services/signatures.service';
import { DocumentsService as SignDocumentsService } from '../../documents/services/documents.service';
import { SignatureFieldsService } from '../../signatures/services/signature-fields.service';
import { EnvelopeDispatchService } from '../../signatures/services/envelope-dispatch.service';
import { Signer, SignerStatus } from '../../signatures/entities/signer.entity';
import {
  buildDocument,
  buildEnvelope,
  buildSigner,
} from '../../signatures/services/signatures-test.fixtures';

/**
 * These tests coordinate EnvelopesService.cancelSentEnvelope and SigningFlowService.acceptSignature
 * with a shared in-memory envelope status. They do not spin up PostgreSQL or run true parallel
 * transactions; they assert ordering outcomes and optimistic-cancel semantics used in production.
 */
describe('Envelope cancel vs signature race (coordinated)', () => {
  const tenantId = 'tenant-1';
  const envelopeId = 'envelope-1';

  const buildDocumentRow = (): Document =>
    ({
      id: 'doc-1',
      tenantId,
      envelopeId,
      title: 'Doc',
      status: DocumentStatus.PENDING_SIGNATURES,
      position: 0,
      createdAt: new Date(),
    }) as Document;

  function createStatefulCancelService(initialStatus: EnvelopeStatus): {
    service: EnvelopesService;
    getStatus: () => EnvelopeStatus;
    setStatus: (next: EnvelopeStatus) => void;
    eventEmitter: EventEmitter2;
    documentsService: jest.Mocked<Pick<DocumentsService, 'findByEnvelope'>>;
  } {
    let status = initialStatus;
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocumentRow()]),
    };

    const envelopeRepository = {
      findOne: jest.fn(async () =>
        buildEnvelope({ id: envelopeId, tenantId, status }),
      ),
      manager: {
        transaction: jest.fn(
          async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) => {
            const update = jest.fn(async (_entity, where, values) => {
              if (
                where.id === envelopeId &&
                where.tenantId === tenantId &&
                where.status === EnvelopeStatus.PENDING_SIGNATURES &&
                status === EnvelopeStatus.PENDING_SIGNATURES
              ) {
                status = values.status as EnvelopeStatus;
                return { affected: 1 };
              }
              return { affected: 0 };
            });
            return cb({ update });
          },
        ),
      },
    } as unknown as Repository<Envelope>;

    const service = new EnvelopesService(
      envelopeRepository,
      {} as FoldersService,
      {} as TenantsService,
      documentsService as unknown as DocumentsService,
      eventEmitter,
    );

    return {
      service,
      getStatus: () => status,
      setStatus: (next: EnvelopeStatus) => {
        status = next;
      },
      eventEmitter,
      documentsService,
    };
  }

  function createSigningFlowService(
    envelopesService: Pick<EnvelopesService, 'findOne'>,
  ): {
    service: SigningFlowService;
    signerRepository: Repository<Signer>;
    eventEmitter: EventEmitter2;
    envelopeDispatchService: jest.Mocked<
      Pick<
        EnvelopeDispatchService,
        'areAllSignersSigned' | 'finalizeEnvelope' | 'notifyNextSigner'
      >
    >;
  } {
    const signerRepository = {
      save: jest.fn(async (signer: Signer) => signer),
    } as unknown as Repository<Signer>;
    const signaturesService = {
      findByToken: jest.fn().mockResolvedValue(
        buildSigner({
          verifiedAt: new Date('2026-01-01T12:00:00.000Z'),
          envelopeId,
          tenantId,
        }),
      ),
    };
    const documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocument()]),
    } as unknown as SignDocumentsService;
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const fieldsService = {
      updateValueByFieldId: jest.fn().mockResolvedValue(undefined),
      findBySigner: jest.fn().mockResolvedValue([]),
    } as unknown as SignatureFieldsService;
    const envelopeDispatchService = {
      areAllSignersSigned: jest.fn().mockResolvedValue(false),
      finalizeEnvelope: jest.fn().mockResolvedValue(undefined),
      notifyNextSigner: jest.fn().mockResolvedValue(undefined),
    };

    const service = new SigningFlowService(
      signerRepository,
      signaturesService as unknown as SignaturesService,
      documentsService,
      envelopesService as EnvelopesService,
      eventEmitter,
      fieldsService,
      envelopeDispatchService as unknown as EnvelopeDispatchService,
    );

    return {
      service,
      signerRepository,
      eventEmitter,
      envelopeDispatchService,
    };
  }

  test('cancel wins before accept: envelope cancelled, accept rejected, no finalize', async () => {
    const { service: cancelService, getStatus, eventEmitter } =
      createStatefulCancelService(EnvelopeStatus.PENDING_SIGNATURES);

    await cancelService.cancelSentEnvelope(envelopeId, tenantId);
    expect(getStatus()).toBe(EnvelopeStatus.CANCELLED);
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      EVENT_DOCUMENT_CANCELLED,
      expect.objectContaining({ documentId: 'doc-1', tenantId }),
    );

    const { service: signingFlow, envelopeDispatchService } =
      createSigningFlowService(cancelService);

    await expect(
      signingFlow.acceptSignature(
        'token-1',
        { consent: 'ok', fields: [] },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      ),
    ).rejects.toThrow(BadRequestException);

    expect(envelopeDispatchService.finalizeEnvelope).not.toHaveBeenCalled();
  });

  test('partial sign then cancel: void cancel preserves signature row, envelope cancelled', async () => {
    const { service: cancelService, getStatus } = createStatefulCancelService(
      EnvelopeStatus.PENDING_SIGNATURES,
    );
    const { service: signingFlow, signerRepository } =
      createSigningFlowService(cancelService);

    const saved = await signingFlow.acceptSignature(
      'token-1',
      { consent: 'ok', fields: [] },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );
    expect(saved.status).toBe(SignerStatus.SIGNED);
    expect(signerRepository.save).toHaveBeenCalled();

    await cancelService.cancelSentEnvelope(envelopeId, tenantId);
    expect(getStatus()).toBe(EnvelopeStatus.CANCELLED);
  });

  test('completed envelope cannot be cancelled after finalize', async () => {
    const { service: cancelService } = createStatefulCancelService(
      EnvelopeStatus.COMPLETED,
    );

    await expect(
      cancelService.cancelSentEnvelope(envelopeId, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  test('optimistic cancel loses race: conflict when status is no longer pending', async () => {
    const { service: cancelService, getStatus } = createStatefulCancelService(
      EnvelopeStatus.COMPLETED,
    );
    expect(getStatus()).toBe(EnvelopeStatus.COMPLETED);

    await expect(
      cancelService.cancelSentEnvelope(envelopeId, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  test('cancel claim failure surfaces ConflictException', async () => {
    let status = EnvelopeStatus.PENDING_SIGNATURES;
    const eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    const documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocumentRow()]),
    };
    const envelopeRepository = {
      findOne: jest.fn(async () =>
        buildEnvelope({ id: envelopeId, tenantId, status }),
      ),
      manager: {
        transaction: jest.fn(
          async (cb: (manager: { update: jest.Mock }) => Promise<boolean>) => {
            status = EnvelopeStatus.COMPLETED;
            const update = jest.fn(async () => ({ affected: 0 }));
            return cb({ update });
          },
        ),
      },
    } as unknown as Repository<Envelope>;

    const cancelService = new EnvelopesService(
      envelopeRepository,
      {} as FoldersService,
      {} as TenantsService,
      documentsService as unknown as DocumentsService,
      eventEmitter,
    );

    await expect(
      cancelService.cancelSentEnvelope(envelopeId, tenantId),
    ).rejects.toThrow(ConflictException);
    expect(eventEmitter.emit).not.toHaveBeenCalledWith(
      EVENT_DOCUMENT_CANCELLED,
      expect.anything(),
    );
  });

  test('last signer completes before cancel: finalize runs, cancel rejected', async () => {
    const { service: cancelService, setStatus } = createStatefulCancelService(
      EnvelopeStatus.PENDING_SIGNATURES,
    );
    const { service: signingFlow, envelopeDispatchService } =
      createSigningFlowService(cancelService);

    envelopeDispatchService.areAllSignersSigned.mockResolvedValue(true);
    envelopeDispatchService.finalizeEnvelope.mockImplementation(async () => {
      setStatus(EnvelopeStatus.COMPLETED);
    });

    await signingFlow.acceptSignature(
      'token-1',
      { consent: 'ok', fields: [] },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );
    expect(envelopeDispatchService.finalizeEnvelope).toHaveBeenCalledWith(
      envelopeId,
      tenantId,
    );

    await expect(
      cancelService.cancelSentEnvelope(envelopeId, tenantId),
    ).rejects.toThrow(BadRequestException);
  });

  test('accept emits signature.completed but never document.completed when cancel follows', async () => {
    const { service: cancelService, eventEmitter: cancelEvents } =
      createStatefulCancelService(EnvelopeStatus.PENDING_SIGNATURES);
    const { service: signingFlow, eventEmitter: signEvents } =
      createSigningFlowService(cancelService);

    await signingFlow.acceptSignature(
      'token-1',
      { consent: 'ok', fields: [] },
      { ipAddress: '127.0.0.1', userAgent: 'jest' },
    );
    expect(signEvents.emit).toHaveBeenCalledWith(
      EVENT_SIGNATURE_COMPLETED,
      expect.any(Object),
    );

    await cancelService.cancelSentEnvelope(envelopeId, tenantId);
    expect(cancelEvents.emit).toHaveBeenCalledWith(
      EVENT_DOCUMENT_CANCELLED,
      expect.any(Object),
    );
    const completedDocumentEvents = (
      cancelEvents.emit as jest.Mock
    ).mock.calls.filter(([name]) => name === 'document.completed');
    expect(completedDocumentEvents).toHaveLength(0);
  });
});

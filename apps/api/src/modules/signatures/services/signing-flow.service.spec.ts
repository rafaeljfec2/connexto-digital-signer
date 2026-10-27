import { BadRequestException, NotFoundException } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { SignatureCompletedEvent } from '@connexto/events';
import { EVENT_SIGNATURE_COMPLETED } from '@connexto/events';
import type { Repository } from 'typeorm';
import { DocumentsService } from '../../documents/services/documents.service';
import { EnvelopeStatus } from '../../envelopes/entities/envelope.entity';
import { EnvelopesService } from '../../envelopes/services/envelopes.service';
import { SignatureFieldType } from '../entities/signature-field.entity';
import { Signer, SignerStatus } from '../entities/signer.entity';
import { EnvelopeDispatchService } from './envelope-dispatch.service';
import { SignatureFieldsService } from './signature-fields.service';
import { buildDocument, buildEnvelope, buildSigner } from './signatures-test.fixtures';
import { SignaturesService } from './signatures.service';
import { SigningFlowService } from './signing-flow.service';

describe('SigningFlowService', () => {
  let service: SigningFlowService;
  let signerRepository: Repository<Signer>;
  let signaturesService: jest.Mocked<Pick<SignaturesService, 'findByToken'>>;
  let documentsService: jest.Mocked<DocumentsService>;
  let envelopesService: jest.Mocked<EnvelopesService>;
  let eventEmitter: EventEmitter2;
  let fieldsService: jest.Mocked<SignatureFieldsService>;
  let envelopeDispatchService: jest.Mocked<
    Pick<
      EnvelopeDispatchService,
      'areAllSignersSigned' | 'finalizeEnvelope' | 'notifyNextSigner'
    >
  >;

  beforeEach(() => {
    signerRepository = {
      save: jest.fn(),
    } as unknown as Repository<Signer>;
    signaturesService = {
      findByToken: jest.fn(),
    };
    documentsService = {
      findByEnvelope: jest.fn().mockResolvedValue([buildDocument()]),
      getOriginalFileStream: jest.fn(),
      getOriginalFileUrl: jest.fn(),
      getFinalFileStream: jest.fn(),
      getFinalFileUrl: jest.fn(),
    } as unknown as jest.Mocked<DocumentsService>;
    envelopesService = {
      findOne: jest.fn().mockResolvedValue(buildEnvelope()),
    } as unknown as jest.Mocked<EnvelopesService>;
    eventEmitter = { emit: jest.fn() } as unknown as EventEmitter2;
    fieldsService = {
      findBySigner: jest.fn(),
      updateValueByFieldId: jest.fn(),
    } as unknown as jest.Mocked<SignatureFieldsService>;
    envelopeDispatchService = {
      areAllSignersSigned: jest.fn().mockResolvedValue(false),
      finalizeEnvelope: jest.fn().mockResolvedValue(undefined),
      notifyNextSigner: jest.fn().mockResolvedValue(undefined),
    };
    service = new SigningFlowService(
      signerRepository,
      signaturesService as unknown as SignaturesService,
      documentsService,
      envelopesService,
      eventEmitter,
      fieldsService,
      envelopeDispatchService as unknown as EnvelopeDispatchService,
    );
  });

  describe('getSignerPdfContent', () => {
    test('should return original file stream and mime type', async () => {
      const signer = buildSigner();
      const document = buildDocument({ mimeType: 'application/pdf' });
      const stream = { pipe: jest.fn() } as unknown as import('node:stream').Readable;
      signaturesService.findByToken.mockResolvedValue(signer);
      documentsService.findByEnvelope.mockResolvedValue([document]);
      documentsService.getOriginalFileStream.mockResolvedValue(stream);

      await expect(service.getSignerPdfContent('token-1')).resolves.toEqual({
        stream,
        mimeType: 'application/pdf',
      });
    });

    test('should throw NotFoundException when document is missing', async () => {
      signaturesService.findByToken.mockResolvedValue(buildSigner());
      documentsService.findByEnvelope.mockResolvedValue([]);

      await expect(service.getSignerPdfContent('token-1')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getSignerSignedPdfContent', () => {
    test('should return null when signed file is missing', async () => {
      signaturesService.findByToken.mockResolvedValue(buildSigner());
      documentsService.findByEnvelope.mockResolvedValue([buildDocument({ finalFileKey: null })]);
      documentsService.getFinalFileStream.mockResolvedValue(null);

      await expect(service.getSignerSignedPdfContent('token-1')).resolves.toBeNull();
    });

    test('should return signed file stream when available', async () => {
      const stream = { pipe: jest.fn() } as unknown as import('node:stream').Readable;
      signaturesService.findByToken.mockResolvedValue(buildSigner());
      documentsService.findByEnvelope.mockResolvedValue([
        buildDocument({ finalFileKey: 'signed.pdf', mimeType: 'application/pdf' }),
      ]);
      documentsService.getFinalFileStream.mockResolvedValue(stream);

      await expect(service.getSignerSignedPdfContent('token-1')).resolves.toEqual({
        stream,
        mimeType: 'application/pdf',
      });
    });
  });

  describe('acceptSignature', () => {
    test('should reject already signed signer', async () => {
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ status: SignerStatus.SIGNED }),
      );

      await expect(
        service.acceptSignature(
          'token-1',
          { consent: 'ok', fields: [] },
          { ipAddress: '127.0.0.1', userAgent: 'jest' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject completed envelope', async () => {
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') }),
      );
      envelopesService.findOne.mockResolvedValue(
        buildEnvelope({ status: EnvelopeStatus.COMPLETED }),
      );

      await expect(
        service.acceptSignature(
          'token-1',
          { consent: 'ok', fields: [] },
          { ipAddress: '127.0.0.1', userAgent: 'jest' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    test('should reject expired envelope', async () => {
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') }),
      );
      envelopesService.findOne.mockResolvedValue(
        buildEnvelope({ expiresAt: new Date('2020-01-01T00:00:00.000Z') }),
      );

      await expect(
        service.acceptSignature(
          'token-1',
          { consent: 'ok', fields: [] },
          { ipAddress: '127.0.0.1', userAgent: 'jest' },
        ),
      ).rejects.toThrow(BadRequestException);
    });

    test('should sign and emit event, without finalizing when not all signed', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const saved = buildSigner({
        status: SignerStatus.SIGNED,
        signedAt: new Date('2026-01-02T00:00:00.000Z'),
        verifiedAt: new Date('2026-01-01T12:00:00.000Z'),
      });
      signaturesService.findByToken.mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      envelopeDispatchService.areAllSignersSigned.mockResolvedValue(false);

      const result = await service.acceptSignature(
        'token-1',
        { consent: 'ok', fields: [] },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(result.status).toBe(SignerStatus.SIGNED);
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_SIGNATURE_COMPLETED,
        expect.objectContaining({
          documentId: 'env-1',
          tenantId: 'tenant-1',
          signerId: saved.id,
        }) as SignatureCompletedEvent,
      );
      expect(envelopeDispatchService.finalizeEnvelope).not.toHaveBeenCalled();
    });

    test('should finalize envelope when all signers signed', async () => {
      const signer = buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') });
      const saved = buildSigner({
        status: SignerStatus.SIGNED,
        verifiedAt: new Date('2026-01-01T12:00:00.000Z'),
      });
      signaturesService.findByToken.mockResolvedValue(signer);
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockResolvedValue(saved);
      envelopeDispatchService.areAllSignersSigned.mockResolvedValue(true);

      await service.acceptSignature(
        'token-1',
        { consent: 'ok', fields: [] },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(envelopeDispatchService.finalizeEnvelope).toHaveBeenCalledWith('env-1', 'tenant-1');
    });

    test('should save geolocation when provided in context', async () => {
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') }),
      );
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockImplementation((s: Signer) => Promise.resolve(s));
      envelopeDispatchService.areAllSignersSigned.mockResolvedValue(false);

      await service.acceptSignature(
        'token-1',
        { consent: 'ok', fields: [] },
        {
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
          latitude: -23.5505199,
          longitude: -46.6333094,
        },
      );

      expect(signerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: -23.5505199,
          longitude: -46.6333094,
        }),
      );
      expect(eventEmitter.emit).toHaveBeenCalledWith(
        EVENT_SIGNATURE_COMPLETED,
        expect.objectContaining({
          latitude: -23.5505199,
          longitude: -46.6333094,
          ipAddress: '127.0.0.1',
          userAgent: 'jest',
        }),
      );
    });

    test('should save null geolocation when not provided in context', async () => {
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') }),
      );
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      (signerRepository.save as jest.Mock).mockImplementation((s: Signer) => Promise.resolve(s));
      envelopeDispatchService.areAllSignersSigned.mockResolvedValue(false);

      await service.acceptSignature(
        'token-1',
        { consent: 'ok', fields: [] },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(signerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({
          latitude: null,
          longitude: null,
        }),
      );
    });

    test('should apply one signatureData to all empty signature fields without repeating PNG in fields', async () => {
      const signatureData = 'data:image/png;base64,AAA';
      const document = buildDocument();
      signaturesService.findByToken.mockResolvedValue(
        buildSigner({ verifiedAt: new Date('2026-01-01T12:00:00.000Z') }),
      );
      envelopesService.findOne.mockResolvedValue(buildEnvelope());
      documentsService.findByEnvelope.mockResolvedValue([document]);
      (signerRepository.save as jest.Mock).mockImplementation((s: Signer) => Promise.resolve(s));
      envelopeDispatchService.areAllSignersSigned.mockResolvedValue(false);
      fieldsService.findBySigner.mockResolvedValue([
        {
          id: 'sig-1',
          type: SignatureFieldType.SIGNATURE,
          value: null,
          signerId: 'signer-1',
        },
        {
          id: 'sig-2',
          type: SignatureFieldType.SIGNATURE,
          value: null,
          signerId: 'signer-1',
        },
        {
          id: 'sig-3',
          type: SignatureFieldType.SIGNATURE,
          value: 'already-set',
          signerId: 'signer-1',
        },
        {
          id: 'name-1',
          type: SignatureFieldType.NAME,
          value: null,
          signerId: 'signer-1',
        },
      ] as never);

      await service.acceptSignature(
        'token-1',
        {
          consent: 'ok',
          fields: [{ fieldId: 'name-1', value: 'Jane Doe' }],
          signatureData,
        },
        { ipAddress: '127.0.0.1', userAgent: 'jest' },
      );

      expect(fieldsService.findBySigner).toHaveBeenCalledWith(
        'tenant-1',
        document.id,
        'signer-1',
      );
      expect(fieldsService.updateValueByFieldId).toHaveBeenCalledWith(
        'tenant-1',
        'name-1',
        'Jane Doe',
      );
      expect(fieldsService.updateValueByFieldId).toHaveBeenCalledWith(
        'tenant-1',
        'sig-1',
        signatureData,
      );
      expect(fieldsService.updateValueByFieldId).toHaveBeenCalledWith(
        'tenant-1',
        'sig-2',
        signatureData,
      );
      expect(fieldsService.updateValueByFieldId).not.toHaveBeenCalledWith(
        'tenant-1',
        'sig-3',
        signatureData,
      );
      expect(signerRepository.save).toHaveBeenCalledWith(
        expect.objectContaining({ signatureData }),
      );
    });
  });
});

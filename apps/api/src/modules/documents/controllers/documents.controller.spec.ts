import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { Document, DocumentStatus } from '../entities/document.entity';
import { DocumentsService } from '../services/documents.service';
import { DocumentsController } from './documents.controller';

const buildDocument = (overrides?: Partial<Document>): Document => ({
  id: 'doc-1',
  tenantId: 'tenant-1',
  envelopeId: 'env-1',
  title: 'Agreement',
  originalFileKey: 'original.pdf',
  finalFileKey: null,
  p7sFileKey: null,
  originalHash: 'hash-original',
  finalHash: null,
  mimeType: 'application/pdf',
  size: 1024,
  status: DocumentStatus.DRAFT,
  version: 1,
  position: 0,
  createdAt: new Date('2026-01-01T00:00:00.000Z'),
  updatedAt: new Date('2026-01-01T00:00:00.000Z'),
  ...overrides,
});

describe('DocumentsController content streaming', () => {
  let controller: DocumentsController;
  let documentsService: jest.Mocked<
    Pick<
      DocumentsService,
      | 'findOne'
      | 'getOriginalFile'
      | 'getOriginalFileStream'
      | 'getFinalFile'
      | 'getFinalFileStream'
      | 'getP7sFile'
      | 'getP7sFileStream'
    >
  >;

  beforeEach(() => {
    documentsService = {
      findOne: jest.fn(),
      getOriginalFile: jest.fn(),
      getOriginalFileStream: jest.fn(),
      getFinalFile: jest.fn(),
      getFinalFileStream: jest.fn(),
      getP7sFile: jest.fn(),
      getP7sFileStream: jest.fn(),
    };
    controller = new DocumentsController(
      documentsService as unknown as DocumentsService,
    );
  });

  test('getFileContent streams via getOriginalFileStream and never buffers with getOriginalFile', async () => {
    const document = buildDocument();
    const stream = Readable.from([Buffer.from('%PDF')]);
    documentsService.findOne.mockResolvedValue(document);
    documentsService.getOriginalFileStream.mockResolvedValue(stream);

    const result = await controller.getFileContent('doc-1', 'tenant-1');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(documentsService.findOne).toHaveBeenCalledWith('doc-1', 'tenant-1');
    expect(documentsService.getOriginalFileStream).toHaveBeenCalledWith(document);
    expect(documentsService.getOriginalFile).not.toHaveBeenCalled();
  });

  test('getSignedFileContent streams via getFinalFileStream and never buffers with getFinalFile', async () => {
    const document = buildDocument({ finalFileKey: 'signed.pdf' });
    const stream = Readable.from([Buffer.from('signed')]);
    documentsService.findOne.mockResolvedValue(document);
    documentsService.getFinalFileStream.mockResolvedValue(stream);

    const result = await controller.getSignedFileContent('doc-1', 'tenant-1');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(documentsService.getFinalFileStream).toHaveBeenCalledWith(document);
    expect(documentsService.getFinalFile).not.toHaveBeenCalled();
  });

  test('getSignedFileContent throws when signed stream is unavailable', async () => {
    const document = buildDocument({ finalFileKey: null });
    documentsService.findOne.mockResolvedValue(document);
    documentsService.getFinalFileStream.mockResolvedValue(null);

    await expect(controller.getSignedFileContent('doc-1', 'tenant-1')).rejects.toThrow(
      NotFoundException,
    );
    expect(documentsService.getFinalFile).not.toHaveBeenCalled();
  });

  test('getP7sFileContent streams via getP7sFileStream and never buffers with getP7sFile', async () => {
    const document = buildDocument({ p7sFileKey: 'signature.p7s' });
    const stream = Readable.from([Buffer.from('p7s')]);
    documentsService.findOne.mockResolvedValue(document);
    documentsService.getP7sFileStream.mockResolvedValue(stream);

    const result = await controller.getP7sFileContent('doc-1', 'tenant-1');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(documentsService.getP7sFileStream).toHaveBeenCalledWith(document);
    expect(documentsService.getP7sFile).not.toHaveBeenCalled();
  });
});

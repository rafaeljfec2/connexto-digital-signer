import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { EnvelopeAuditService } from '../services/envelope-audit.service';
import { SignaturesService } from '../services/signatures.service';
import { SigningFlowService } from '../services/signing-flow.service';
import { VerificationService } from '../services/verification.service';
import { SignController } from './signatures.controller';

describe('SignController content streaming', () => {
  let controller: SignController;
  let signingFlowService: jest.Mocked<
    Pick<SigningFlowService, 'getSignerPdfContent' | 'getSignerSignedPdfContent'>
  >;

  beforeEach(() => {
    signingFlowService = {
      getSignerPdfContent: jest.fn(),
      getSignerSignedPdfContent: jest.fn(),
    };
    controller = new SignController(
      {} as SignaturesService,
      signingFlowService as unknown as SigningFlowService,
      {} as EnvelopeAuditService,
      {} as VerificationService,
    );
  });

  test('getSignerPdfContent wraps service stream and never returns a Buffer payload', async () => {
    const stream = Readable.from([Buffer.from('%PDF')]);
    signingFlowService.getSignerPdfContent.mockResolvedValue({
      stream,
      mimeType: 'application/pdf',
    });

    const result = await controller.getSignerPdfContent('token-1', undefined);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(signingFlowService.getSignerPdfContent).toHaveBeenCalledWith('token-1', undefined);
  });

  test('getSignerSignedPdfContent wraps signed stream when available', async () => {
    const stream = Readable.from([Buffer.from('signed')]);
    signingFlowService.getSignerSignedPdfContent.mockResolvedValue({
      stream,
      mimeType: 'application/pdf',
    });

    const result = await controller.getSignerSignedPdfContent('token-1', 'doc-1');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(signingFlowService.getSignerSignedPdfContent).toHaveBeenCalledWith(
      'token-1',
      'doc-1',
    );
  });

  test('getSignerSignedPdfContent throws when signed content is missing', async () => {
    signingFlowService.getSignerSignedPdfContent.mockResolvedValue(null);

    await expect(
      controller.getSignerSignedPdfContent('token-1', undefined),
    ).rejects.toThrow(NotFoundException);
  });
});

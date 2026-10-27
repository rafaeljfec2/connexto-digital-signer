import { NotFoundException, StreamableFile } from '@nestjs/common';
import { Readable } from 'node:stream';
import { SignaturesService } from '../services/signatures.service';
import { VerificationService } from '../services/verification.service';
import { SignController } from './signatures.controller';

describe('SignController content streaming', () => {
  let controller: SignController;
  let signaturesService: jest.Mocked<
    Pick<SignaturesService, 'getSignerPdfContent' | 'getSignerSignedPdfContent'>
  >;

  beforeEach(() => {
    signaturesService = {
      getSignerPdfContent: jest.fn(),
      getSignerSignedPdfContent: jest.fn(),
    };
    controller = new SignController(
      signaturesService as unknown as SignaturesService,
      {} as VerificationService,
    );
  });

  test('getSignerPdfContent wraps service stream and never returns a Buffer payload', async () => {
    const stream = Readable.from([Buffer.from('%PDF')]);
    signaturesService.getSignerPdfContent.mockResolvedValue({
      stream,
      mimeType: 'application/pdf',
    });

    const result = await controller.getSignerPdfContent('token-1', undefined);

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(signaturesService.getSignerPdfContent).toHaveBeenCalledWith('token-1', undefined);
  });

  test('getSignerSignedPdfContent wraps signed stream when available', async () => {
    const stream = Readable.from([Buffer.from('signed')]);
    signaturesService.getSignerSignedPdfContent.mockResolvedValue({
      stream,
      mimeType: 'application/pdf',
    });

    const result = await controller.getSignerSignedPdfContent('token-1', 'doc-1');

    expect(result).toBeInstanceOf(StreamableFile);
    expect(result.getStream()).toBe(stream);
    expect(signaturesService.getSignerSignedPdfContent).toHaveBeenCalledWith('token-1', 'doc-1');
  });

  test('getSignerSignedPdfContent throws when signed content is missing', async () => {
    signaturesService.getSignerSignedPdfContent.mockResolvedValue(null);

    await expect(
      controller.getSignerSignedPdfContent('token-1', undefined),
    ).rejects.toThrow(NotFoundException);
  });
});

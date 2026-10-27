import { Readable } from 'node:stream';
import { S3StorageService } from './s3-storage.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  CreateBucketCommand,
  HeadBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  CopyObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  HeadBucketCommand: jest.fn().mockImplementation((input) => ({ input })),
  CreateBucketCommand: jest.fn().mockImplementation((input) => ({ input })),
}));

jest.mock('@aws-sdk/s3-request-presigner', () => ({
  getSignedUrl: jest.fn(),
}));

const setEnv = (values: Record<string, string | undefined>) => {
  for (const [key, value] of Object.entries(values)) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
};

const asyncStream = (chunks: Array<Buffer | Uint8Array>) => ({
  [Symbol.asyncIterator]: async function* () {
    for (const chunk of chunks) {
      yield chunk;
    }
  },
});

describe('S3StorageService', () => {
  const originalNodeEnv = process.env['NODE_ENV'];

  beforeEach(() => {
    sendMock.mockReset();
    (getSignedUrl as jest.Mock).mockReset();
    (S3Client as unknown as jest.Mock).mockClear();
    (PutObjectCommand as unknown as jest.Mock).mockClear();
    (CopyObjectCommand as unknown as jest.Mock).mockClear();
    (CreateBucketCommand as unknown as jest.Mock).mockClear();
    (HeadBucketCommand as unknown as jest.Mock).mockClear();
    setEnv({
      NODE_ENV: 'test',
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'documents',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
    });
  });

  afterAll(() => {
    setEnv({ NODE_ENV: originalNodeEnv });
  });

  test('should configure checksum WHEN_REQUIRED when endpoint is set', () => {
    new S3StorageService();

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
        endpoint: 'http://localhost:9000',
        forcePathStyle: true,
        requestChecksumCalculation: 'WHEN_REQUIRED',
        responseChecksumValidation: 'WHEN_REQUIRED',
      }),
    );
  });

  test('should put object', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ ETag: 'etag' });

    const result = await service.put('key', Buffer.from('data'));

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'documents',
      Key: 'key',
      Body: Buffer.from('data'),
      ContentType: 'application/pdf',
    });
    expect(sendMock).toHaveBeenCalledWith(expect.objectContaining({ input: expect.any(Object) }));
    expect(result).toEqual({ key: 'key', etag: 'etag' });
  });

  test('should put object with custom content type', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ ETag: 'etag' });

    await service.put('key', Buffer.from('data'), 'application/custom');

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'documents',
      Key: 'key',
      Body: Buffer.from('data'),
      ContentType: 'application/custom',
    });
  });

  test('should omit SSE in production when custom endpoint is set', async () => {
    setEnv({ NODE_ENV: 'production' });
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ ETag: 'etag' });

    await service.put('key', Buffer.from('data'));

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'documents',
      Key: 'key',
      Body: Buffer.from('data'),
      ContentType: 'application/pdf',
    });
  });

  test('should use SSE in production without custom endpoint', async () => {
    setEnv({ NODE_ENV: 'production', S3_ENDPOINT: undefined });
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ ETag: 'etag' });

    await service.put('key', Buffer.from('data'));

    expect(PutObjectCommand).toHaveBeenCalledWith({
      Bucket: 'documents',
      Key: 'key',
      Body: Buffer.from('data'),
      ContentType: 'application/pdf',
      ServerSideEncryption: 'AES256',
    });
  });

  test('should create missing bucket in production when endpoint is set', async () => {
    setEnv({ NODE_ENV: 'production' });
    const service = new S3StorageService();
    const missingBucket = Object.assign(new Error('Unknown'), {
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    sendMock
      .mockRejectedValueOnce(missingBucket)
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce({ ETag: 'etag' });

    await service.put('key', Buffer.from('data'));

    expect(HeadBucketCommand).toHaveBeenCalledWith({ Bucket: 'documents' });
    expect(CreateBucketCommand).toHaveBeenCalledWith({ Bucket: 'documents' });
  });

  test('should not create missing bucket in production without custom endpoint', async () => {
    setEnv({ NODE_ENV: 'production', S3_ENDPOINT: undefined });
    const service = new S3StorageService();
    const missingBucket = Object.assign(new Error('Unknown'), {
      name: 'NotFound',
      $metadata: { httpStatusCode: 404 },
    });
    sendMock.mockRejectedValueOnce(missingBucket);

    await expect(service.put('key', Buffer.from('data'))).rejects.toBe(missingBucket);

    expect(HeadBucketCommand).toHaveBeenCalledWith({ Bucket: 'documents' });
    expect(CreateBucketCommand).not.toHaveBeenCalled();
  });

  test('should get object', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({
      Body: asyncStream([Buffer.from('a'), Buffer.from('b')]),
    });

    const result = await service.get('key');

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'documents', Key: 'key' });
    expect(result.toString('utf-8')).toBe('ab');
  });

  test('should return a Readable from AsyncIterable body', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({
      Body: asyncStream([Buffer.from('chunk-1'), Buffer.from('chunk-2')]),
    });

    const stream = await service.getStream('key');
    expect(stream).toBeInstanceOf(Readable);

    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'documents', Key: 'key' });
    expect(Buffer.concat(chunks).toString('utf-8')).toBe('chunk-1chunk-2');
  });

  test('should return Node Readable body as-is', async () => {
    const service = new S3StorageService();
    const body = Readable.from([Buffer.from('direct')]);
    sendMock.mockResolvedValue({ Body: body });

    const stream = await service.getStream('key');

    expect(stream).toBe(body);
  });

  test('should convert Web ReadableStream body via transformToWebStream', async () => {
    const service = new S3StorageService();
    const webStream = new ReadableStream<Uint8Array>({
      start(controller) {
        controller.enqueue(new TextEncoder().encode('web'));
        controller.close();
      },
    });
    sendMock.mockResolvedValue({
      Body: {
        transformToWebStream: () => webStream,
      },
    });

    const stream = await service.getStream('key');
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    expect(Buffer.concat(chunks).toString('utf-8')).toBe('web');
  });

  test('should throw when response body is empty', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ Body: undefined });

    await expect(service.get('key')).rejects.toThrow('Empty response body');
  });

  test('should throw when getStream response body is empty', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ Body: undefined });

    await expect(service.getStream('key')).rejects.toThrow('Empty response body');
  });

  test('should throw when getStream body type is unsupported', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ Body: {} });

    await expect(service.getStream('key')).rejects.toThrow('Unsupported S3 response body type');
  });

  test('should delete object', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({});

    await service.delete('key');

    expect(DeleteObjectCommand).toHaveBeenCalledWith({ Bucket: 'documents', Key: 'key' });
  });

  test('should get signed url', async () => {
    const service = new S3StorageService();
    (getSignedUrl as jest.Mock).mockResolvedValue('signed-url');

    const result = await service.getSignedUrl('key', 300);

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ input: { Bucket: 'documents', Key: 'key' } }),
      { expiresIn: 300 }
    );
    expect(result).toBe('signed-url');
  });

  test('should get signed url with disposition attachment', async () => {
    const service = new S3StorageService();
    (getSignedUrl as jest.Mock).mockResolvedValue('signed-url-attachment');

    const result = await service.getSignedUrl('key', 300, { disposition: 'attachment' });

    expect(GetObjectCommand).toHaveBeenCalledWith({
      Bucket: 'documents',
      Key: 'key',
      ResponseContentDisposition: 'attachment',
    });
    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.any(Object),
      { expiresIn: 300 }
    );
    expect(result).toBe('signed-url-attachment');
  });

  test('should use defaults without endpoint or credentials', () => {
    setEnv({
      S3_ENDPOINT: undefined,
      S3_ACCESS_KEY_ID: undefined,
      S3_SECRET_ACCESS_KEY: undefined,
    });

    const service = new S3StorageService();

    expect(S3Client).toHaveBeenCalledWith(
      expect.objectContaining({
        region: 'us-east-1',
      })
    );
    expect(S3Client).toHaveBeenCalledWith(
      expect.not.objectContaining({
        requestChecksumCalculation: 'WHEN_REQUIRED',
      }),
    );
    expect(service).toBeDefined();
  });

  test('should use default expiresInSeconds', async () => {
    const service = new S3StorageService();
    (getSignedUrl as jest.Mock).mockResolvedValue('signed-url');

    await service.getSignedUrl('key');

    expect(getSignedUrl).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({ input: { Bucket: 'documents', Key: 'key' } }),
      { expiresIn: 300 }
    );
  });
});

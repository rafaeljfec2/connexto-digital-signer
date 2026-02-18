import { S3StorageService } from './s3-storage.service';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

const sendMock = jest.fn();

jest.mock('@aws-sdk/client-s3', () => ({
  S3Client: jest.fn().mockImplementation(() => ({ send: sendMock })),
  PutObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  GetObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
  DeleteObjectCommand: jest.fn().mockImplementation((input) => ({ input })),
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
  beforeEach(() => {
    sendMock.mockReset();
    (getSignedUrl as jest.Mock).mockReset();
    (S3Client as unknown as jest.Mock).mockClear();
    setEnv({
      S3_REGION: 'us-east-1',
      S3_BUCKET: 'documents',
      S3_ENDPOINT: 'http://localhost:9000',
      S3_ACCESS_KEY_ID: 'minioadmin',
      S3_SECRET_ACCESS_KEY: 'minioadmin',
    });
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

  test('should get object', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({
      Body: asyncStream([Buffer.from('a'), Buffer.from('b')]),
    });

    const result = await service.get('key');

    expect(GetObjectCommand).toHaveBeenCalledWith({ Bucket: 'documents', Key: 'key' });
    expect(result.toString('utf-8')).toBe('ab');
  });

  test('should throw when response body is empty', async () => {
    const service = new S3StorageService();
    sendMock.mockResolvedValue({ Body: undefined });

    await expect(service.get('key')).rejects.toThrow('Empty response body');
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

  test('should use defaults without endpoint or credentials', async () => {
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

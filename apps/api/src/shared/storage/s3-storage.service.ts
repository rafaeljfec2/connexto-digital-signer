import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  CopyObjectCommand,
  HeadBucketCommand,
  CreateBucketCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { SignedUrlOptions } from '@connexto/shared';
import { IStorageService, PutObjectResult } from '@connexto/shared';
import { Readable } from 'node:stream';
import type { ReadableStream as NodeWebReadableStream } from 'node:stream/web';

type WebStreamBody = {
  readonly transformToWebStream: () => NodeWebReadableStream;
};

const isWebStreamBody = (body: object): body is WebStreamBody =>
  'transformToWebStream' in body &&
  typeof (body as { transformToWebStream?: unknown }).transformToWebStream === 'function';

const isAsyncIterableBody = (body: object): body is AsyncIterable<Uint8Array> =>
  Symbol.asyncIterator in body &&
  typeof (body as { [Symbol.asyncIterator]?: unknown })[Symbol.asyncIterator] === 'function';

const toNodeReadable = (body: object): Readable => {
  if (body instanceof Readable) {
    return body;
  }
  if (isWebStreamBody(body)) {
    return Readable.fromWeb(body.transformToWebStream());
  }
  if (isAsyncIterableBody(body)) {
    return Readable.from(body);
  }
  throw new Error('Unsupported S3 response body type');
};

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly useServerSideEncryption: boolean;
  private readonly canCreateBucket: boolean;
  private bucketReady: Promise<void> | null = null;

  constructor() {
    const region = process.env['S3_REGION'] ?? 'us-east-1';
    const endpoint = process.env['S3_ENDPOINT'];
    const isProduction = process.env['NODE_ENV'] === 'production';
    this.bucket = process.env['S3_BUCKET'] ?? 'documents';
    this.useServerSideEncryption = isProduction && !endpoint;
    this.canCreateBucket = !isProduction || Boolean(endpoint);
    this.client = new S3Client({
      region,
      ...(endpoint
        ? {
            endpoint,
            forcePathStyle: true,
            requestChecksumCalculation: 'WHEN_REQUIRED' as const,
            responseChecksumValidation: 'WHEN_REQUIRED' as const,
          }
        : {}),
      credentials:
        process.env['S3_ACCESS_KEY_ID'] && process.env['S3_SECRET_ACCESS_KEY']
          ? {
              accessKeyId: process.env['S3_ACCESS_KEY_ID'],
              secretAccessKey: process.env['S3_SECRET_ACCESS_KEY'],
            }
          : undefined,
    });
  }

  async put(key: string, body: Buffer, contentType?: string): Promise<PutObjectResult> {
    await this.ensureBucket();
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType ?? 'application/pdf',
      ...(this.useServerSideEncryption && { ServerSideEncryption: 'AES256' }),
    });
    const result = await this.client.send(command);
    return { key, etag: result.ETag ?? undefined };
  }

  async get(key: string): Promise<Buffer> {
    const stream = await this.getStream(key);
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream) {
      chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
  }

  async getStream(key: string): Promise<Readable> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.client.send(command);
    const body = response.Body;
    if (body === undefined || body === null) {
      throw new Error('Empty response body');
    }
    return toNodeReadable(body);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(command);
  }

  async copy(sourceKey: string, destinationKey: string): Promise<PutObjectResult> {
    await this.ensureBucket();
    const command = new CopyObjectCommand({
      Bucket: this.bucket,
      CopySource: `${this.bucket}/${sourceKey}`,
      Key: destinationKey,
      ...(this.useServerSideEncryption && { ServerSideEncryption: 'AES256' }),
    });
    const result = await this.client.send(command);
    return { key: destinationKey, etag: result.CopyObjectResult?.ETag ?? undefined };
  }

  async getSignedUrl(
    key: string,
    expiresInSeconds = 300,
    options?: SignedUrlOptions,
  ): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucket,
      Key: key,
      ...(options?.disposition && {
        ResponseContentDisposition: options.disposition,
      }),
    });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }

  private ensureBucket(): Promise<void> {
    if (this.bucketReady) return this.bucketReady;

    this.bucketReady = (async () => {
      try {
        await this.client.send(new HeadBucketCommand({ Bucket: this.bucket }));
      } catch (error) {
        if (!this.canCreateBucket || !this.isMissingBucket(error)) {
          throw error;
        }
        await this.client.send(new CreateBucketCommand({ Bucket: this.bucket }));
      }
    })();
    return this.bucketReady;
  }

  private isMissingBucket(error: unknown): boolean {
    const name = error instanceof Error ? error.name : '';
    const statusCode = (error as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;
    return statusCode === 404 || name === 'NotFound' || name === 'NoSuchBucket';
  }
}

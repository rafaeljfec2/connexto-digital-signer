import { Injectable } from '@nestjs/common';
import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { IStorageService, PutObjectResult } from '@connexto/shared';

@Injectable()
export class S3StorageService implements IStorageService {
  private readonly client: S3Client;
  private readonly bucket: string;

  constructor() {
    const region = process.env['S3_REGION'] ?? 'us-east-1';
    const endpoint = process.env['S3_ENDPOINT'];
    this.bucket = process.env['S3_BUCKET'] ?? 'documents';
    this.client = new S3Client({
      region,
      ...(endpoint && { endpoint, forcePathStyle: true }),
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
    const command = new PutObjectCommand({
      Bucket: this.bucket,
      Key: key,
      Body: body,
      ContentType: contentType ?? 'application/pdf',
    });
    const result = await this.client.send(command);
    return { key, etag: result.ETag ?? undefined };
  }

  async get(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    const response = await this.client.send(command);
    const stream = response.Body;
    if (stream === undefined) throw new Error('Empty response body');
    const chunks: Uint8Array[] = [];
    for await (const chunk of stream as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  }

  async delete(key: string): Promise<void> {
    const command = new DeleteObjectCommand({ Bucket: this.bucket, Key: key });
    await this.client.send(command);
  }

  async getSignedUrl(key: string, expiresInSeconds = 3600): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.client, command, { expiresIn: expiresInSeconds });
  }
}

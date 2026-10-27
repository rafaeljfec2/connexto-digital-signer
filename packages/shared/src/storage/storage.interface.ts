import type { Readable } from 'node:stream';

export interface PutObjectResult {
  key: string;
  etag?: string;
}

export interface SignedUrlOptions {
  readonly expiresInSeconds?: number;
  readonly disposition?: 'attachment' | 'inline';
}

export interface IStorageService {
  put(key: string, body: Buffer, contentType?: string): Promise<PutObjectResult>;
  get(key: string): Promise<Buffer>;
  getStream(key: string): Promise<Readable>;
  delete(key: string): Promise<void>;
  copy(sourceKey: string, destinationKey: string): Promise<PutObjectResult>;
  getSignedUrl(key: string, expiresInSeconds?: number, options?: SignedUrlOptions): Promise<string>;
}

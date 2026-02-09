import type { TokenUsage } from './token-usage.types';

export interface AiEmbeddingRequest {
  readonly model?: string;
  readonly input: string | ReadonlyArray<string>;
}

export interface AiEmbeddingResponse {
  readonly embeddings: ReadonlyArray<ReadonlyArray<number>>;
  readonly model: string;
  readonly usage: TokenUsage;
}

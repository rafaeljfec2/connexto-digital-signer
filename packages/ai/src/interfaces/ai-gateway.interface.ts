import type { AiCompletionRequest, AiCompletionResponse } from '../types/completion.types';
import type { AiEmbeddingRequest, AiEmbeddingResponse } from '../types/embedding.types';

export interface IAiGateway {
  complete(request: AiCompletionRequest): Promise<AiCompletionResponse>;

  embed(request: AiEmbeddingRequest): Promise<AiEmbeddingResponse>;

  completeWithJsonResponse<T>(request: AiCompletionRequest): Promise<T>;
}

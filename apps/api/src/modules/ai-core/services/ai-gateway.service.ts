import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiEmbeddingRequest,
  AiEmbeddingResponse,
  IAiGateway,
  IAiProvider,
} from '@connexto/ai';
import { AI_PROVIDER_TOKEN } from '@connexto/ai';
import { Inject, Injectable, Logger } from '@nestjs/common';

@Injectable()
export class AiGatewayService implements IAiGateway {
  private readonly logger = new Logger(AiGatewayService.name);

  constructor(
    @Inject(AI_PROVIDER_TOKEN)
    private readonly provider: IAiProvider
  ) {}

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    this.logger.debug(
      `Sending completion request to ${this.provider.name} (model: ${request.model ?? 'default'})`
    );

    try {
      const response = await this.provider.complete(request);
      this.logger.debug(
        `Completion received — tokens: ${String(response.usage.totalTokens)}, finish: ${response.finishReason}`
      );
      return response;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI completion failed: ${message}`);
      throw error;
    }
  }

  async embed(request: AiEmbeddingRequest): Promise<AiEmbeddingResponse> {
    this.logger.debug(`Sending embedding request to ${this.provider.name}`);

    try {
      return await this.provider.embed(request);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`AI embedding failed: ${message}`);
      throw error;
    }
  }

  async completeWithJsonResponse<T>(request: AiCompletionRequest): Promise<T> {
    const jsonRequest: AiCompletionRequest = {
      ...request,
      responseFormat: 'json_object',
    };

    const response = await this.complete(jsonRequest);

    try {
      return JSON.parse(response.content) as T;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to parse JSON response: ${message}`);
      this.logger.debug(`Raw response: ${response.content.slice(0, 500)}`);
      throw new Error(`AI returned invalid JSON: ${message}`);
    }
  }
}

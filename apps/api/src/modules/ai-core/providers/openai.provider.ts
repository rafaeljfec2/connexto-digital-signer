import type {
  AiCompletionRequest,
  AiCompletionResponse,
  AiEmbeddingRequest,
  AiEmbeddingResponse,
  IAiProvider,
  TokenUsage,
} from '@connexto/ai';
import { AI_MODELS } from '@connexto/ai';
import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';

@Injectable()
export class OpenAiProvider implements IAiProvider {
  readonly name = 'openai';
  private readonly client: OpenAI;
  private readonly logger = new Logger(OpenAiProvider.name);

  constructor() {
    const apiKey = process.env['AI_API_KEY'];
    if (!apiKey) {
      this.logger.warn('AI_API_KEY is not set — AI features will not work');
    }
    this.client = new OpenAI({ apiKey: apiKey ?? '' });
  }

  async complete(request: AiCompletionRequest): Promise<AiCompletionResponse> {
    const model = request.model ?? AI_MODELS.OPENAI_GPT4O_MINI;

    const messages = request.messages.map((msg) => {
      if (typeof msg.content === 'string') {
        return { role: msg.role, content: msg.content };
      }

      const parts = msg.content.map((part) => {
        if (part.type === 'image_url' && part.image_url) {
          return {
            type: 'image_url' as const,
            image_url: {
              url: part.image_url.url,
              detail: part.image_url.detail ?? ('auto' as const),
            },
          };
        }
        return { type: 'text' as const, text: part.text ?? '' };
      });

      return { role: msg.role, content: parts };
    });

    const response = await this.client.chat.completions.create({
      model,
      messages: messages as OpenAI.ChatCompletionMessageParam[],
      temperature: request.temperature ?? 0.2,
      max_tokens: request.maxTokens ?? 4096,
      ...(request.responseFormat === 'json_object' && {
        response_format: { type: 'json_object' },
      }),
    });

    const choice = response.choices[0];
    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: response.usage?.completion_tokens ?? 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    return {
      content: choice?.message?.content ?? '',
      model: response.model,
      usage,
      finishReason: choice?.finish_reason ?? 'unknown',
    };
  }

  async embed(request: AiEmbeddingRequest): Promise<AiEmbeddingResponse> {
    const model = request.model ?? AI_MODELS.OPENAI_EMBEDDING_SMALL;

    const input = typeof request.input === 'string' ? request.input : [...request.input];

    const response = await this.client.embeddings.create({
      model,
      input,
    });

    const embeddings = response.data.map((item) => item.embedding);
    const usage: TokenUsage = {
      promptTokens: response.usage?.prompt_tokens ?? 0,
      completionTokens: 0,
      totalTokens: response.usage?.total_tokens ?? 0,
    };

    return {
      embeddings,
      model: response.model,
      usage,
    };
  }
}

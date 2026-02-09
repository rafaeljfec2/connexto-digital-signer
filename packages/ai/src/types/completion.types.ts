import type { TokenUsage } from './token-usage.types';

export interface AiMessageContent {
  readonly type: 'text' | 'image_url';
  readonly text?: string;
  readonly image_url?: { readonly url: string; readonly detail?: 'low' | 'high' | 'auto' };
}

export interface AiMessage {
  readonly role: 'system' | 'user' | 'assistant';
  readonly content: string | ReadonlyArray<AiMessageContent>;
}

export interface AiCompletionRequest {
  readonly model?: string;
  readonly messages: ReadonlyArray<AiMessage>;
  readonly temperature?: number;
  readonly maxTokens?: number;
  readonly responseFormat?: 'text' | 'json_object';
}

export interface AiCompletionResponse {
  readonly content: string;
  readonly model: string;
  readonly usage: TokenUsage;
  readonly finishReason: string;
}

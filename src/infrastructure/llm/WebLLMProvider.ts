/**
 * WebLLMProvider.ts
 * WebLLM implementation of ILLMProvider.
 *
 * @version 1.0.0
 */

import * as webllm from '@mlc-ai/web-llm';
import { ILLMProvider, LLMMessage, LLMRequestOptions, LLMResponse, LoadProgress, LLMError } from '@domain/ports/ILLMProvider';
import { Result, ok, err } from '@shared/types/Result';

export interface WebLLMConfig {
  modelId: string;
  maxTokens?: number;
  temperature?: number;
}

export class WebLLMProvider implements ILLMProvider {
  private engine: webllm.MLCEngine | null = null;

  constructor(private config: WebLLMConfig) {}

  async *load(modelId?: string): AsyncGenerator<LoadProgress, Result<void, LLMError>> {
    const targetModel = modelId ?? this.config.modelId;
    try {
      this.engine = await webllm.CreateMLCEngine(targetModel);
      yield { progress: 1, text: 'Model loaded' };
      return ok(undefined);
    } catch (e) {
      return err({ code: 'UNKNOWN', message: String(e) });
    }
  }

  async *stream(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): AsyncGenerator<string, Result<LLMResponse, LLMError>> {
    if (!this.engine) {
      return err({ code: 'MODEL_NOT_FOUND', message: 'Model not loaded' });
    }
    try {
      const webllmMessages = messages.map(m => ({ role: m.role as any, content: m.content }));
      const request: webllm.ChatCompletionCreateParams = {
        messages: webllmMessages,
        stream: true,
        temperature: options?.temperature ?? this.config.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? this.config.maxTokens
      };
      const stream = await this.engine.chat.completions.create(request);
      let fullContent = '';
      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content;
        if (delta) {
          fullContent += delta;
          yield delta;
        }
      }
      return ok({ id: `webllm-${Date.now()}`, content: fullContent, finishReason: 'stop' });
    } catch (e) {
      return err({ code: 'UNKNOWN', message: String(e) });
    }
  }

  async embed(text: string): Promise<Result<Float32Array, LLMError>> {
    // Not yet supported by WebLLM; return dummy
    return ok(new Float32Array(384));
  }

  async dispose(): Promise<void> {
    this.engine = null;
  }
}

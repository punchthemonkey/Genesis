/**
 * ILLMProvider.ts
 * Port for LLM inference (local or cloud).
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 1: Performance Contracts
 */

import { Result } from '@shared/types/Result';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  name?: string;
  tool_call_id?: string;
}

export interface ToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, unknown>; // JSON Schema
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface LLMResponse {
  id: string;
  content: string;
  toolCalls?: ToolCall[];
  finishReason: 'stop' | 'tool_calls' | 'length';
}

export interface LoadProgress {
  progress: number; // 0-1
  text: string;
}

export type LLMError =
  | { code: 'MODEL_NOT_FOUND'; message: string }
  | { code: 'CONTEXT_LOSS'; message: string }
  | { code: 'QUOTA_EXCEEDED'; message: string }
  | { code: 'NETWORK'; message: string }
  | { code: 'UNKNOWN'; message: string };

export interface LLMRequestOptions {
  temperature?: number;
  maxTokens?: number;
  tools?: ToolDefinition[];
}

/**
 * LLM Provider port.
 * All methods return Result types; no exceptions thrown across boundary.
 */
export interface ILLMProvider {
  /**
   * Loads a model into memory. Yields progress updates.
   * @performance Model loading may take 5-30 seconds depending on network and device.
   * @error `MODEL_NOT_FOUND` – The requested model ID is invalid or unavailable.
   * @error `NETWORK` – Failed to fetch model weights.
   */
  load(modelId: string): AsyncGenerator<LoadProgress, Result<void, LLMError>>;

  /**
   * Streams a completion from the LLM.
   * @performance First token should arrive within <500ms on supported hardware.
   * @error `CONTEXT_LOSS` – WebGPU context was lost during inference.
   * @error `QUOTA_EXCEEDED` – Memory limits exceeded.
   */
  stream(
    messages: LLMMessage[],
    options?: LLMRequestOptions
  ): AsyncGenerator<string, Result<LLMResponse, LLMError>>;

  /**
   * Generates an embedding vector for the given text.
   * @performance Should complete in <100ms for typical sentence lengths.
   */
  embed(text: string): Promise<Result<Float32Array, LLMError>>;

  /**
   * Releases resources associated with the loaded model.
   */
  dispose(): Promise<void>;
}

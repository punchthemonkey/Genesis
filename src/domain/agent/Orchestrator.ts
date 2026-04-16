/**
 * Orchestrator.ts
 * Core ReAct loop for single‑agent turns.
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 1: Performance Contracts
 */

import { ILLMProvider, LLMMessage, LLMResponse } from '@domain/ports/ILLMProvider';
import { IToolExecutor } from '@domain/ports/IToolExecutor';
import { IEventEmitter } from '@domain/ports/IEventEmitter';
import { Result, ok, err } from '@shared/types/Result';
import { TurnId, generateId } from '@shared/types/Brand';

export type OrchestratorError =
  | { code: 'LLM_ERROR'; message: string; cause?: unknown }
  | { code: 'TOOL_ERROR'; message: string; cause?: unknown }
  | { code: 'MAX_ITERATIONS'; message: string };

/**
 * Orchestrator domain service.
 * Executes a ReAct loop: the LLM can call tools, results are fed back, until a final answer.
 */
export class Orchestrator {
  private readonly maxIterations = 5;

  constructor(
    private readonly llmProvider: ILLMProvider,
    private readonly toolExecutor: IToolExecutor,
    private readonly eventEmitter: IEventEmitter
  ) {}

  /**
   * Runs a single turn given conversation history and user message.
   * @performance First token latency <500ms; tool execution <2s.
   * @error `LLM_ERROR` – The LLM provider failed.
   * @error `TOOL_ERROR` – A tool execution failed.
   * @error `MAX_ITERATIONS` – ReAct loop exceeded maximum steps.
   */
  async run(
    messages: LLMMessage[],
    turnId: TurnId = generateId<TurnId>()
  ): Promise<Result<LLMResponse, OrchestratorError>> {
    this.eventEmitter.emit('orchestrator:turn:started', {
      turnId,
      userMessage: messages[messages.length - 1]?.content ?? '',
      conversationId: '' // filled by use case
    });

    const workingMessages = [...messages];
    let iteration = 0;

    try {
      while (iteration < this.maxIterations) {
        iteration++;
        this.eventEmitter.emit('orchestrator:thought', { step: iteration, thought: 'Thinking...' });

        let fullResponse = '';
        let finalResult: Result<LLMResponse, any> | null = null;
        const stream = this.llmProvider.stream(workingMessages, {
          tools: this.buildToolDefinitions()
        });

        for await (const chunk of stream) {
          if (typeof chunk === 'string') {
            fullResponse += chunk;
            this.eventEmitter.emit('llm:stream:token', { token: chunk, turnId });
          } else {
            finalResult = chunk;
          }
        }

        if (!finalResult) {
          return err({ code: 'LLM_ERROR', message: 'No response from LLM' });
        }
        if (!finalResult.ok) {
          return err({ code: 'LLM_ERROR', message: finalResult.error.message });
        }

        const response = finalResult.value;

        if (response.toolCalls && response.toolCalls.length > 0) {
          workingMessages.push({
            role: 'assistant',
            content: response.content || '',
            tool_calls: response.toolCalls
          });

          for (const toolCall of response.toolCalls) {
            this.eventEmitter.emit('orchestrator:tool:started', { toolCall });
            const start = performance.now();
            const toolResult = await this.toolExecutor.execute(toolCall);
            const duration = performance.now() - start;

            if (toolResult.ok) {
              this.eventEmitter.emit('orchestrator:tool:completed', {
                result: toolResult.value,
                durationMs: duration
              });
              workingMessages.push({
                role: 'tool',
                content: JSON.stringify(toolResult.value.output),
                tool_call_id: toolCall.id
              });
            } else {
              this.eventEmitter.emit('orchestrator:tool:completed', {
                result: { error: toolResult.error.message },
                durationMs: duration
              });
              return err({ code: 'TOOL_ERROR', message: toolResult.error.message });
            }
          }
          continue;
        }

        workingMessages.push({
          role: 'assistant',
          content: response.content
        });

        this.eventEmitter.emit('orchestrator:turn:completed', {
          turnId,
          response: response.content
        });
        return ok(response);
      }

      return err({ code: 'MAX_ITERATIONS', message: 'Exceeded maximum ReAct iterations' });
    } catch (error) {
      return err({ code: 'LLM_ERROR', message: String(error) });
    }
  }

  private buildToolDefinitions() {
    const toolNames = this.toolExecutor.listTools();
    return toolNames.map(name => ({
      name,
      description: `Tool: ${name}`,
      parameters: { type: 'object', properties: {} }
    }));
  }
}

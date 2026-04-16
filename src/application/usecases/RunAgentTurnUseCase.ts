/**
 * RunAgentTurnUseCase.ts
 * Primary use case: process a user message and return the assistant's response.
 *
 * @version 1.0.0
 */

import { inject, injectable } from 'tsyringe';
import { TOKENS } from '@infrastructure/di/tokens';
import { ILLMProvider, LLMMessage } from '@domain/ports/ILLMProvider';
import { IToolExecutor } from '@domain/ports/IToolExecutor';
import { IMemoryStore } from '@domain/ports/IMemoryStore';
import { IEventEmitter } from '@domain/ports/IEventEmitter';
import { Conversation, Turn } from '@domain/conversation/Conversation';
import { Result, ok, err } from '@shared/types/Result';
import { Orchestrator } from '@domain/agent/Orchestrator';
import { SkillRegistry } from '@domain/skill/SkillRegistry';
import { ConversationId, generateId } from '@shared/types/Brand';

export interface RunAgentTurnInput {
  conversationId?: ConversationId;
  userMessage: string;
  activeSkillId?: string;
}

export type TurnError =
  | { code: 'CONVERSATION_NOT_FOUND'; message: string }
  | { code: 'LLM_ERROR'; message: string; cause?: unknown }
  | { code: 'TOOL_ERROR'; message: string; cause?: unknown }
  | { code: 'MAX_ITERATIONS'; message: string };

export interface RunAgentTurnOutput {
  turn: Turn;
  conversation: Conversation;
}

@injectable()
export class RunAgentTurnUseCase {
  constructor(
    @inject(TOKENS.LLMProvider) private llmProvider: ILLMProvider,
    @inject(TOKENS.ToolExecutor) private toolExecutor: IToolExecutor,
    @inject(TOKENS.MemoryStore) private memoryStore: IMemoryStore,
    @inject(TOKENS.EventBus) private eventBus: IEventEmitter,
    @inject(SkillRegistry) private skillRegistry: SkillRegistry
  ) {}

  async execute(input: RunAgentTurnInput): Promise<Result<RunAgentTurnOutput, TurnError>> {
    // 1. Load or create conversation
    let conversation: Conversation;
    if (input.conversationId) {
      const convResult = await this.memoryStore.getConversation(input.conversationId);
      if (!convResult.ok) {
        return err({ code: 'CONVERSATION_NOT_FOUND', message: 'Conversation not found' });
      }
      conversation = convResult.value;
    } else {
      conversation = Conversation.create();
    }

    // 2. Set active skill and build system prompt
    if (input.activeSkillId) {
      this.skillRegistry.setActiveSkill(input.activeSkillId as any);
    }
    let systemPrompt = 'You are a helpful assistant.';
    const activeSkillResult = await this.skillRegistry.getActiveSkill();
    if (activeSkillResult.ok && activeSkillResult.value) {
      systemPrompt = activeSkillResult.value.systemPrompt;
    }

    // 3. Build message history
    const messages: LLMMessage[] = [];
    messages.push({ role: 'system', content: systemPrompt });
    for (const turn of conversation.getRecentTurns(10)) {
      messages.push({ role: 'user', content: turn.userMessage });
      messages.push({ role: 'assistant', content: turn.assistantResponse });
    }
    messages.push({ role: 'user', content: input.userMessage });

    // 4. Run orchestrator
    const orchestrator = new Orchestrator(this.llmProvider, this.toolExecutor, this.eventBus);
    const turnId = generateId();
    const responseResult = await orchestrator.run(messages, turnId);

    if (!responseResult.ok) {
      const error = responseResult.error;
      if (error.code === 'MAX_ITERATIONS') {
        return err({ code: 'MAX_ITERATIONS', message: error.message });
      }
      return err({ code: 'LLM_ERROR', message: error.message, cause: error });
    }

    const response = responseResult.value;

    // 5. Persist turn
    const turn = conversation.addTurn(input.userMessage, response.content);
    const saveResult = await this.memoryStore.saveConversation(conversation);
    if (!saveResult.ok) {
      console.error('Failed to save conversation', saveResult.error);
    }

    return ok({ turn, conversation });
  }
}

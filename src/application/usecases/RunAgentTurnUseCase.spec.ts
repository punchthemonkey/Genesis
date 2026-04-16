import { describe, it, expect, beforeEach } from 'vitest';
import { RunAgentTurnUseCase } from './RunAgentTurnUseCase';
import { MockLLMProvider } from '@infrastructure/llm/MockLLMProvider';
import { CompositeToolExecutor } from '@infrastructure/tools/CompositeToolExecutor';
import { CalculatorTool } from '@infrastructure/tools/CalculatorTool';
import { IndexedDBMemoryStore } from '@infrastructure/memory/IndexedDBMemoryStore';
import { EventBus } from '@application/events/EventBus';
import { SkillRegistry } from '@domain/skill/SkillRegistry';
import 'fake-indexeddb/auto';

describe('RunAgentTurnUseCase', () => {
  let useCase: RunAgentTurnUseCase;
  let mockLLM: MockLLMProvider;
  let toolExecutor: CompositeToolExecutor;
  let memoryStore: IndexedDBMemoryStore;
  let eventBus: EventBus;
  let registry: SkillRegistry;

  beforeEach(async () => {
    mockLLM = new MockLLMProvider();
    toolExecutor = new CompositeToolExecutor();
    toolExecutor.register(new CalculatorTool());
    memoryStore = new IndexedDBMemoryStore();
    await memoryStore.purgeAll();
    eventBus = new EventBus();
    registry = new SkillRegistry(memoryStore);
    useCase = new RunAgentTurnUseCase(mockLLM, toolExecutor, memoryStore, eventBus, registry);
  });

  it('should process a simple turn', async () => {
    const result = await useCase.execute({ userMessage: 'Hello' });
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value.turn.assistantResponse).toContain('Hello');
      expect(result.value.conversation.turnCount).toBe(1);
    }
  });

  it('should persist conversation across turns', async () => {
    const first = await useCase.execute({ userMessage: 'First' });
    expect(first.ok).toBe(true);
    const convId = first.ok ? first.value.conversation.id : null;
    const second = await useCase.execute({ conversationId: convId!, userMessage: 'Second' });
    expect(second.ok).toBe(true);
    if (second.ok) expect(second.value.conversation.turnCount).toBe(2);
  });
});

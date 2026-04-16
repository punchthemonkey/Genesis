/**
 * container.ts
 * Composition root for tsyringe dependency injection.
 *
 * @version 1.0.0
 */

import 'reflect-metadata';
import { container } from 'tsyringe';
import { TOKENS } from './tokens';
import { ConsoleLogger } from '../logging/ConsoleLogger';
import { EventBus } from '@application/events/EventBus';
import { WebLLMProvider } from '../llm/WebLLMProvider';
import { CompositeToolExecutor } from '../tools/CompositeToolExecutor';
import { CalculatorTool } from '../tools/CalculatorTool';
import { IndexedDBMemoryStore } from '../memory/IndexedDBMemoryStore';
import { WebCryptoKeychain } from '../keychain/WebCryptoKeychain';
import { SkillRegistry } from '@domain/skill/SkillRegistry';
import { RunAgentTurnUseCase } from '@application/usecases/RunAgentTurnUseCase';
import { InstallSkillUseCase } from '@application/usecases/InstallSkillUseCase';

// Infrastructure adapters
container.register(TOKENS.Logger, { useClass: ConsoleLogger });
container.register(TOKENS.EventBus, { useValue: new EventBus() });

const llmProvider = new WebLLMProvider({ modelId: import.meta.env.VITE_DEFAULT_MODEL || 'SmolLM2-135M-Instruct-q4f16_1-MLC' });
container.register(TOKENS.LLMProvider, { useValue: llmProvider });

const toolExecutor = new CompositeToolExecutor();
toolExecutor.register(new CalculatorTool());
container.register(TOKENS.ToolExecutor, { useValue: toolExecutor });

container.register(TOKENS.MemoryStore, { useClass: IndexedDBMemoryStore });
container.register(TOKENS.Keychain, { useClass: WebCryptoKeychain });

// Domain services
container.register(SkillRegistry, { useClass: SkillRegistry }).singleton();

// Use cases
container.register(RunAgentTurnUseCase, { useClass: RunAgentTurnUseCase });
container.register(InstallSkillUseCase, { useClass: InstallSkillUseCase });

export { container };

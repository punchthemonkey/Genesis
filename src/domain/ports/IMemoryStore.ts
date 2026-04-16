/**
 * IMemoryStore.ts
 * Port for persistent storage of conversations and semantic memories.
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 3: Explicit Edge‑Case Enumeration
 */

import { Result } from '@shared/types/Result';
import { ConversationId, Conversation } from '../conversation/Conversation';
import { MemoryEntry, MemoryId } from '../memory/MemoryEntry';
import { Skill, SkillId } from '../skill/Skill';

export type MemoryError =
  | { code: 'QUOTA_EXCEEDED'; message: string }
  | { code: 'STORAGE_UNAVAILABLE'; message: string }
  | { code: 'NOT_FOUND'; message: string }
  | { code: 'SERIALIZATION_FAILED'; message: string }
  | { code: 'TRANSACTION_TIMEOUT'; message: string };

export interface MemorySearchOptions {
  limit?: number;
  threshold?: number; // similarity threshold (0-1)
}

export interface MemorySearchResult {
  entry: MemoryEntry;
  similarity: number;
}

/**
 * Memory Store port for persistent storage of conversations and semantic memories.
 */
export interface IMemoryStore {
  // Conversation methods
  saveConversation(conv: Conversation): Promise<Result<void, MemoryError>>;
  getConversation(id: ConversationId): Promise<Result<Conversation, MemoryError>>;
  listConversations(limit?: number): Promise<Result<Conversation[], MemoryError>>;
  deleteConversation(id: ConversationId): Promise<Result<void, MemoryError>>;

  // Semantic memory methods
  saveMemory(entry: MemoryEntry): Promise<Result<void, MemoryError>>;
  searchMemories(
    queryEmbedding: Float32Array,
    options?: MemorySearchOptions
  ): Promise<Result<MemorySearchResult[], MemoryError>>;
  getMemory(id: MemoryId): Promise<Result<MemoryEntry, MemoryError>>;
  deleteMemory(id: MemoryId): Promise<Result<void, MemoryError>>;

  // Skill methods
  saveSkill(skill: Skill): Promise<Result<void, MemoryError>>;
  getSkill(id: SkillId): Promise<Result<Skill, MemoryError>>;
  listSkills(): Promise<Result<Skill[], MemoryError>>;
  deleteSkill(id: SkillId): Promise<Result<void, MemoryError>>;

  // Maintenance
  getStorageUsage(): Promise<Result<{ usedBytes: number; quotaBytes: number }, MemoryError>>;
  purgeAll(): Promise<Result<void, MemoryError>>;
}

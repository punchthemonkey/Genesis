/**
 * Brand.ts
 * Branded type utilities for compile‑time nominal typing.
 * Prevents mixing up different ID types (e.g., AgentId vs SkillId).
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 2: Runtime Validation at Boundaries
 */

export type Brand<T, B extends string> = T & { __brand: B };

export type AgentId = Brand<string, 'AgentId'>;
export type SkillId = Brand<string, 'SkillId'>;
export type ConversationId = Brand<string, 'ConversationId'>;
export type TurnId = Brand<string, 'TurnId'>;
export type MemoryId = Brand<string, 'MemoryId'>;
export type KeyHandle = Brand<string, 'KeyHandle'>;

/**
 * Generates a cryptographically random UUID v4 and casts it to the branded type.
 * @example
 * const convId = generateId<ConversationId>();
 */
export function generateId<T extends Brand<string, any>>(): T {
  return crypto.randomUUID() as T;
}

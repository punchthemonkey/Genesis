/**
 * Conversation.ts
 * Conversation aggregate root and Turn value object.
 *
 * @version 1.0.0
 */

import { Brand, generateId } from '@shared/types/Brand';

export type ConversationId = Brand<string, 'ConversationId'>;
export type TurnId = Brand<string, 'TurnId'>;

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface TurnMetadata {
  toolCalls?: ToolCall[];
  skillId?: string;
}

/**
 * Value object representing a single turn (user message + assistant response).
 */
export class Turn {
  constructor(
    public readonly id: TurnId,
    public readonly userMessage: string,
    public readonly assistantResponse: string,
    public readonly metadata: TurnMetadata = {},
    public readonly timestamp: Date = new Date()
  ) {}

  static create(
    userMessage: string,
    assistantResponse: string,
    metadata?: TurnMetadata
  ): Turn {
    return new Turn(
      generateId<TurnId>(),
      userMessage,
      assistantResponse,
      metadata,
      new Date()
    );
  }
}

/**
 * Conversation aggregate root.
 * Manages a collection of turns and enforces invariants.
 */
export class Conversation {
  private _turns: Turn[] = [];
  public readonly createdAt: Date;
  public updatedAt: Date;

  constructor(
    public readonly id: ConversationId,
    turns: Turn[] = [],
    createdAt?: Date
  ) {
    this._turns = [...turns];
    this.createdAt = createdAt ?? new Date();
    this.updatedAt = new Date();
  }

  static create(): Conversation {
    return new Conversation(generateId<ConversationId>());
  }

  /**
   * Adds a turn to the conversation.
   * @returns The newly added Turn.
   */
  addTurn(userMessage: string, assistantResponse: string, metadata?: TurnMetadata): Turn {
    const turn = Turn.create(userMessage, assistantResponse, metadata);
    this._turns.push(turn);
    this.updatedAt = new Date();
    return turn;
  }

  /**
   * Returns the most recent turns up to the specified limit.
   */
  getRecentTurns(limit: number): Turn[] {
    return this._turns.slice(-Math.max(0, limit));
  }

  get turns(): readonly Turn[] {
    return this._turns;
  }

  get turnCount(): number {
    return this._turns.length;
  }

  /**
   * Checks if the conversation exceeds the maximum allowed turns and should be pruned.
   * Invariant: max 1000 turns per conversation for performance and storage.
   */
  needsPruning(maxTurns: number = 1000): boolean {
    return this._turns.length > maxTurns;
  }

  /**
   * Prunes the oldest turns to stay within the limit.
   * @returns The number of turns removed.
   */
  prune(maxTurns: number = 1000): number {
    const initialCount = this._turns.length;
    if (initialCount <= maxTurns) return 0;
    this._turns = this._turns.slice(-maxTurns);
    this.updatedAt = new Date();
    return initialCount - this._turns.length;
  }

  /**
   * Creates a new Conversation instance from serialized data.
   */
  static fromJSON(data: any): Conversation | null {
    if (!data?.id || typeof data.id !== 'string') return null;
    if (!Array.isArray(data.turns)) return null;
    const turns = data.turns.map((t: any) => {
      if (!t?.id || !t.userMessage || !t.assistantResponse) return null;
      return new Turn(
        t.id as TurnId,
        t.userMessage,
        t.assistantResponse,
        t.metadata ?? {},
        new Date(t.timestamp ?? Date.now())
      );
    });
    if (turns.some(t => t === null)) return null;
    return new Conversation(
      data.id as ConversationId,
      turns as Turn[],
      new Date(data.createdAt ?? Date.now())
    );
  }

  /**
   * Serializes the conversation to a plain object for storage.
   */
  toJSON(): object {
    return {
      id: this.id,
      turns: this._turns.map(t => ({
        id: t.id,
        userMessage: t.userMessage,
        assistantResponse: t.assistantResponse,
        metadata: t.metadata,
        timestamp: t.timestamp.toISOString()
      })),
      createdAt: this.createdAt.toISOString(),
      updatedAt: this.updatedAt.toISOString()
    };
  }
}

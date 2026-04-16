/**
 * MemoryEntry.ts
 * Value object for semantic memory with embedding.
 *
 * @version 1.0.0
 */

import { Brand, generateId } from '@shared/types/Brand';

export type MemoryId = Brand<string, 'MemoryId'>;
export type MemorySource = 'conversation' | 'document' | 'explicit';

/**
 * Value object representing a semantic memory entry with embedding.
 */
export class MemoryEntry {
  constructor(
    public readonly id: MemoryId,
    public readonly content: string,
    public readonly embedding: Float32Array,
    public readonly source: MemorySource,
    public readonly metadata: Record<string, unknown> = {},
    public readonly createdAt: Date = new Date()
  ) {}

  static create(
    content: string,
    embedding: Float32Array,
    source: MemorySource,
    metadata?: Record<string, unknown>
  ): MemoryEntry {
    return new MemoryEntry(
      generateId<MemoryId>(),
      content,
      embedding,
      source,
      metadata,
      new Date()
    );
  }

  /**
   * Computes cosine similarity with another embedding.
   */
  cosineSimilarity(other: Float32Array): number {
    if (this.embedding.length !== other.length) {
      throw new Error('Embedding dimensions do not match');
    }
    let dot = 0;
    let normA = 0;
    let normB = 0;
    for (let i = 0; i < this.embedding.length; i++) {
      dot += this.embedding[i] * other[i];
      normA += this.embedding[i] * this.embedding[i];
      normB += other[i] * other[i];
    }
    if (normA === 0 || normB === 0) return 0;
    return dot / (Math.sqrt(normA) * Math.sqrt(normB));
  }

  toJSON(): object {
    return {
      id: this.id,
      content: this.content,
      embedding: Array.from(this.embedding),
      source: this.source,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString()
    };
  }

  static fromJSON(data: any): MemoryEntry | null {
    if (!data?.id || !data.content || !data.embedding || !data.source) return null;
    if (!Array.isArray(data.embedding)) return null;
    const embedding = new Float32Array(data.embedding);
    return new MemoryEntry(
      data.id as MemoryId,
      data.content,
      embedding,
      data.source,
      data.metadata ?? {},
      new Date(data.createdAt ?? Date.now())
    );
  }
}

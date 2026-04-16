/**
 * IEventEmitter.ts
 * Port for event emission. Keeps domain decoupled from concrete EventBus.
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 5: Production‑Grade Observability
 */

export interface IEventEmitter {
  /**
   * Emits an event with a typed payload.
   */
  emit<T>(event: string, payload: T): void;

  /**
   * Subscribes to an event.
   * @returns An unsubscribe function.
   */
  on<T>(event: string, callback: (payload: T) => void): () => void;
}

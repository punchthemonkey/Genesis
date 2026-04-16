/**
 * Result.ts
 * Result monad for explicit error handling without exceptions.
 * Forces callers to handle both success and failure cases.
 *
 * @version 1.0.0
 * @see GOAT Standard Pillar 3: Explicit Edge‑Case Enumeration
 */

export type Result<T, E = Error> =
  | { ok: true; value: T }
  | { ok: false; error: E };

/**
 * Creates a successful Result.
 */
export const ok = <T>(value: T): Result<T, never> => ({ ok: true, value });

/**
 * Creates a failed Result.
 */
export const err = <E>(error: E): Result<never, E> => ({ ok: false, error });

/**
 * Type guard for successful Result.
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; value: T } {
  return result.ok === true;
}

/**
 * Type guard for failed Result.
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return result.ok === false;
}

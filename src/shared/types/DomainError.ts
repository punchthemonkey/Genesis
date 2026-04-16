/**
 * DomainError.ts
 * Base interface for all domain‑level errors.
 * Ensures consistent error structure across the application.
 *
 * @version 1.0.0
 */

export interface DomainError {
  /** Machine‑readable error code (e.g., 'NOT_FOUND'). */
  code: string;
  /** Human‑readable description. */
  message: string;
  /** Optional additional context. */
  details?: unknown;
}

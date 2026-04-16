/**
 * ConsoleLogger.ts
 * Simple console-based implementation of ILogger.
 *
 * @version 1.0.0
 */

import { ILogger } from '@domain/ports/ILogger';

export class ConsoleLogger implements ILogger {
  debug(message: string, ...args: unknown[]): void {
    console.debug(`[DEBUG] ${message}`, ...args);
  }

  info(message: string, ...args: unknown[]): void {
    console.info(`[INFO] ${message}`, ...args);
  }

  warn(message: string, ...args: unknown[]): void {
    console.warn(`[WARN] ${message}`, ...args);
  }

  error(message: string, ...args: unknown[]): void {
    console.error(`[ERROR] ${message}`, ...args);
  }
}

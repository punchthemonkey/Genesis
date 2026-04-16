/**
 * setup.ts
 * Global test setup for Vitest.
 *
 * @version 1.0.0
 */

import 'fake-indexeddb/auto';
import { beforeAll, afterAll, vi } from 'vitest';

if (typeof crypto === 'undefined') {
  global.crypto = require('crypto').webcrypto;
}

beforeAll(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  vi.spyOn(console, 'warn').mockImplementation(() => {});
});

afterAll(() => {
  vi.restoreAllMocks();
});

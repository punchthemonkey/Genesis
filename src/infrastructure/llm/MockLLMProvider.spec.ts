/**
 * MockLLMProvider.spec.ts
 * Unit tests for MockLLMProvider.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { MockLLMProvider } from './MockLLMProvider';
import { LLMMessage } from '@domain/ports/ILLMProvider';

describe('MockLLMProvider', () => {
  let provider: MockLLMProvider;

  beforeEach(() => {
    provider = new MockLLMProvider();
  });

  it('should load model with progress updates', async () => {
    const generator = provider.load('test-model');
    const updates = [];
    let finalResult;
    for await (const update of generator) {
      if ('progress' in update) {
        updates.push(update);
      } else {
        finalResult = update;
      }
    }
    expect(updates.length).toBe(11); // 0/10 to 10/10
    expect(finalResult.ok).toBe(true);
  });

  it('should return default echo response', async () => {
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }];
    const generator = provider.stream(messages);
    const chunks = [];
    let finalResult;
    for await (const chunk of generator) {
      if (typeof chunk === 'string') {
        chunks.push(chunk);
      } else {
        finalResult = chunk;
      }
    }
    expect(chunks.join('').trim()).toBe("I'm a mock assistant. You said: Hello");
    expect(finalResult.ok).toBe(true);
    if (finalResult.ok) {
      expect(finalResult.value.content).toContain('Hello');
    }
  });

  it('should use scripted response when match is found', async () => {
    provider.addResponse(
      (msgs) => msgs.some(m => m.content.includes('secret')),
      'Scripted response'
    );
    const messages: LLMMessage[] = [{ role: 'user', content: 'Tell me a secret' }];
    const generator = provider.stream(messages);
    const chunks = [];
    let finalResult;
    for await (const chunk of generator) {
      if (typeof chunk === 'string') {
        chunks.push(chunk);
      } else {
        finalResult = chunk;
      }
    }
    expect(finalResult.ok).toBe(true);
    if (finalResult.ok) {
      expect(finalResult.value.content).toBe('Scripted response');
    }
  });

  it('should handle scripted response as generator function', async () => {
    provider.addResponse(
      () => true,
      async function* () {
        yield 'Part 1';
        yield 'Part 2';
        return { ok: true, value: { id: 'test', content: 'Part 1 Part 2', finishReason: 'stop' as const } };
      }
    );
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hi' }];
    const generator = provider.stream(messages);
    const chunks = [];
    for await (const chunk of generator) {
      if (typeof chunk === 'string') chunks.push(chunk);
    }
    expect(chunks).toEqual(['Part 1', 'Part 2']);
  });

  it('should return dummy embedding', async () => {
    const result = await provider.embed('test');
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.value).toBeInstanceOf(Float32Array);
      expect(result.value.length).toBe(384);
    }
  });

  it('should reset scripted responses', async () => {
    provider.addResponse(() => true, 'Scripted');
    provider.reset();
    const messages: LLMMessage[] = [{ role: 'user', content: 'Hello' }];
    const generator = provider.stream(messages);
    let finalResult;
    for await (const chunk of generator) {
      if (typeof chunk !== 'string') finalResult = chunk;
    }
    expect(finalResult.ok).toBe(true);
    if (finalResult.ok) {
      expect(finalResult.value.content).toContain("I'm a mock assistant");
    }
  });
});

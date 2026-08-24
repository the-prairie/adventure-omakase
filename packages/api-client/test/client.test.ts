import { afterEach, describe, expect, it, vi } from 'vitest';

import { requestHealth, type HealthTransport } from '../src/index.js';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('health API client', () => {
  it('normalizes the base URL and validates the shared health payload', async () => {
    const transport = vi.fn<HealthTransport>().mockResolvedValue({
      json: () =>
        Promise.resolve({
          status: 'ok',
          service: 'adventure-omakase-api',
          version: '0.0.0',
        }),
      ok: true,
      status: 200,
    });

    await expect(requestHealth('/api/', transport)).resolves.toEqual({
      status: 'ok',
      service: 'adventure-omakase-api',
      version: '0.0.0',
    });
    expect(transport).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({
        headers: { accept: 'application/json' },
        signal: expect.any(AbortSignal),
      }),
    );
  });

  it('returns a typed HTTP failure', async () => {
    const transport = vi.fn<HealthTransport>().mockResolvedValue({
      json: () => Promise.resolve({}),
      ok: false,
      status: 503,
    });

    await expect(
      requestHealth('http://localhost:4000', transport),
    ).rejects.toMatchObject({
      code: 'http',
      status: 503,
    });
  });

  it('rejects a malformed successful response', async () => {
    const transport = vi.fn<HealthTransport>().mockResolvedValue({
      json: () => Promise.resolve({ status: 'wrong' }),
      ok: true,
      status: 200,
    });

    await expect(
      requestHealth('http://localhost:4000', transport),
    ).rejects.toMatchObject({
      code: 'invalid_payload',
    });
  });

  it('aborts and classifies a request that exceeds its deadline', async () => {
    vi.useFakeTimers();
    const transport: HealthTransport = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      });

    const request = requestHealth('/api', transport, { timeoutMs: 25 });
    const assertion = expect(request).rejects.toMatchObject({
      code: 'timeout',
    });

    await vi.advanceTimersByTimeAsync(25);
    await assertion;
  });

  it('propagates explicit caller cancellation', async () => {
    const parent = new AbortController();
    const transport: HealthTransport = (_url, init) =>
      new Promise((_resolve, reject) => {
        init?.signal?.addEventListener(
          'abort',
          () => reject(new DOMException('Aborted', 'AbortError')),
          { once: true },
        );
      });

    const request = requestHealth('/api', transport, {
      signal: parent.signal,
    });
    parent.abort();

    await expect(request).rejects.toMatchObject({ code: 'aborted' });
  });

  it('rejects an invalid timeout before starting transport', async () => {
    const transport = vi.fn<HealthTransport>();

    await expect(
      requestHealth('/api', transport, { timeoutMs: 0 }),
    ).rejects.toThrow('Health request timeout must be a positive number.');
    expect(transport).not.toHaveBeenCalled();
  });
});

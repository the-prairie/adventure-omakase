import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { HealthStatus } from './health-status';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
  vi.restoreAllMocks();
});

describe('HealthStatus', () => {
  it('shows loading and then the connected API identity', async () => {
    globalThis.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        status: 'ok',
        service: 'adventure-omakase-api',
        version: '0.0.0',
        commitSha: 'test-sha',
      }),
    });

    render(<HealthStatus apiBaseUrl="/api" />);

    expect(screen.getByRole('status')).toHaveTextContent(
      'Checking API connection',
    );
    expect(await screen.findByText('Connected')).toBeInTheDocument();
    expect(screen.getByText('adventure-omakase-api')).toBeInTheDocument();
    expect(globalThis.fetch).toHaveBeenCalledWith(
      '/api/health',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
  });

  it('shows an unavailable state and recovers through retry', async () => {
    globalThis.fetch = vi
      .fn()
      .mockRejectedValueOnce(new Error('offline'))
      .mockResolvedValueOnce({
        ok: true,
        json: vi.fn().mockResolvedValue({
          status: 'ok',
          service: 'adventure-omakase-api',
          version: '0.0.0',
        }),
      });

    render(<HealthStatus apiBaseUrl="/api" />);

    expect(await screen.findByText('Unavailable')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry API connection' }),
    );

    await waitFor(() =>
      expect(screen.getByText('Connected')).toBeInTheDocument(),
    );
    expect(globalThis.fetch).toHaveBeenCalledTimes(2);
  });

  it('aborts an in-flight request when the component unmounts', () => {
    let signal: AbortSignal | undefined;
    globalThis.fetch = vi
      .fn()
      .mockImplementation((_input: RequestInfo | URL, init?: RequestInit) => {
        signal = init?.signal ?? undefined;
        return new Promise<Response>(() => undefined);
      });

    const view = render(<HealthStatus apiBaseUrl="/api" />);
    view.unmount();

    expect(signal?.aborted).toBe(true);
  });
});

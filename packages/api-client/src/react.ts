'use client';

import type { HealthResponse } from '@adventure-omakase/contracts';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  HealthRequestError,
  requestHealth,
  type HealthFailureCode,
  type HealthRequestOptions,
  type HealthTransport,
} from './health.js';

export type HealthConnection =
  | { status: 'loading' }
  | { status: 'connected'; health: HealthResponse }
  | { status: 'unavailable'; reason: HealthFailureCode };

export interface HealthConnectionOptions {
  timeoutMs?: number;
}

function unavailableReason(error: unknown): HealthFailureCode {
  return error instanceof HealthRequestError ? error.code : 'network';
}

export function useHealthConnection(
  apiBaseUrl: string,
  transport: HealthTransport = fetch,
  options: HealthConnectionOptions = {},
) {
  const [connection, setConnection] = useState<HealthConnection>({
    status: 'loading',
  });
  const requestSequence = useRef(0);
  const activeController = useRef<AbortController | null>(null);

  const checkConnection = useCallback(async () => {
    const sequence = requestSequence.current + 1;
    requestSequence.current = sequence;

    activeController.current?.abort();
    const controller = new AbortController();
    activeController.current = controller;
    setConnection({ status: 'loading' });

    const requestOptions: HealthRequestOptions = {
      signal: controller.signal,
    };
    if (options.timeoutMs !== undefined) {
      requestOptions.timeoutMs = options.timeoutMs;
    }

    try {
      const health = await requestHealth(apiBaseUrl, transport, requestOptions);
      if (requestSequence.current === sequence) {
        setConnection({ status: 'connected', health });
      }
    } catch (error) {
      const aborted =
        error instanceof HealthRequestError && error.code === 'aborted';
      if (requestSequence.current === sequence && !aborted) {
        setConnection({
          status: 'unavailable',
          reason: unavailableReason(error),
        });
      }
    } finally {
      if (activeController.current === controller) {
        activeController.current = null;
      }
    }
  }, [apiBaseUrl, options.timeoutMs, transport]);

  useEffect(() => {
    void checkConnection();
    return () => {
      requestSequence.current += 1;
      activeController.current?.abort();
      activeController.current = null;
    };
  }, [checkConnection]);

  return { connection, retry: checkConnection };
}

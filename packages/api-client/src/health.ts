import {
  healthResponseSchema,
  type HealthResponse,
} from '@adventure-omakase/contracts';

export const DEFAULT_HEALTH_TIMEOUT_MS = 5_000;

export type HealthFailureCode =
  'timeout' | 'aborted' | 'http' | 'invalid_payload' | 'network';

export class HealthRequestError extends Error {
  readonly code: HealthFailureCode;
  readonly status: number | undefined;

  constructor(
    code: HealthFailureCode,
    message: string,
    options: { cause?: unknown; status?: number } = {},
  ) {
    super(
      message,
      options.cause === undefined ? undefined : { cause: options.cause },
    );
    this.name = 'HealthRequestError';
    this.code = code;
    this.status = options.status;
  }
}

export type HealthTransport = (
  url: string,
  init?: Pick<RequestInit, 'headers' | 'signal'>,
) => Promise<{
  json(): Promise<unknown>;
  ok: boolean;
  status: number;
}>;

export interface HealthRequestOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

function healthUrl(apiBaseUrl: string): string {
  let end = apiBaseUrl.length;
  while (end > 0 && apiBaseUrl[end - 1] === '/') end--;
  const normalizedBaseUrl = apiBaseUrl.slice(0, end);
  return `${normalizedBaseUrl}/health`;
}

export async function requestHealth(
  apiBaseUrl: string,
  transport: HealthTransport = fetch,
  options: HealthRequestOptions = {},
): Promise<HealthResponse> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_HEALTH_TIMEOUT_MS;
  if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) {
    throw new TypeError('Health request timeout must be a positive number.');
  }

  if (options.signal?.aborted) {
    throw new HealthRequestError('aborted', 'Health request was aborted.');
  }

  const controller = new AbortController();
  let timedOut = false;
  const abortFromParent = () => controller.abort();

  options.signal?.addEventListener('abort', abortFromParent, { once: true });
  const timeout = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);

  try {
    let response: Awaited<ReturnType<HealthTransport>>;
    try {
      response = await transport(healthUrl(apiBaseUrl), {
        headers: { accept: 'application/json' },
        signal: controller.signal,
      });
    } catch (cause) {
      if (options.signal?.aborted) {
        throw new HealthRequestError('aborted', 'Health request was aborted.', {
          cause,
        });
      }
      if (timedOut) {
        throw new HealthRequestError(
          'timeout',
          `Health request exceeded ${timeoutMs} ms.`,
          { cause },
        );
      }
      if (controller.signal.aborted) {
        throw new HealthRequestError('aborted', 'Health request was aborted.', {
          cause,
        });
      }
      throw new HealthRequestError(
        'network',
        'Health request could not reach the API.',
        { cause },
      );
    }

    if (options.signal?.aborted) {
      throw new HealthRequestError('aborted', 'Health request was aborted.');
    }
    if (timedOut) {
      throw new HealthRequestError(
        'timeout',
        `Health request exceeded ${timeoutMs} ms.`,
      );
    }

    if (!response.ok) {
      throw new HealthRequestError(
        'http',
        `Health request returned ${response.status}.`,
        { status: response.status },
      );
    }

    let payload: unknown;
    try {
      payload = await response.json();
    } catch (cause) {
      throw new HealthRequestError(
        'invalid_payload',
        'Health response was not valid JSON.',
        { cause },
      );
    }

    const parsed = healthResponseSchema.safeParse(payload);
    if (!parsed.success) {
      throw new HealthRequestError(
        'invalid_payload',
        'Health response did not match the shared contract.',
        { cause: parsed.error },
      );
    }

    return parsed.data;
  } finally {
    clearTimeout(timeout);
    options.signal?.removeEventListener('abort', abortFromParent);
  }
}

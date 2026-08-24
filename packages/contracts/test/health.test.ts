import { describe, expect, it } from 'vitest';

import {
  errorResponseSchema,
  healthResponseSchema,
  readinessResponseSchema,
} from '../src/index.js';

describe('health response contract', () => {
  it('accepts the documented API health payload', () => {
    expect(
      healthResponseSchema.parse({
        status: 'ok',
        service: 'adventure-omakase-api',
        version: '0.0.0',
        commitSha: 'local',
      }),
    ).toEqual({
      status: 'ok',
      service: 'adventure-omakase-api',
      version: '0.0.0',
      commitSha: 'local',
    });
  });

  it('rejects payloads with unknown fields', () => {
    expect(() =>
      healthResponseSchema.parse({
        status: 'ok',
        service: 'adventure-omakase-api',
        version: '0.0.0',
        secret: 'must-not-leak',
      }),
    ).toThrow();
  });
});

describe('readiness response contract', () => {
  it.each([
    [{ status: 'ready', dependencies: { database: 'available' } }],
    [{ status: 'not_ready', dependencies: { database: 'unavailable' } }],
  ])('accepts a supported readiness state', (payload) => {
    expect(readinessResponseSchema.parse(payload)).toEqual(payload);
  });
});

describe('error response contract', () => {
  it('requires a stable code, message, and request ID', () => {
    expect(
      errorResponseSchema.parse({
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'An unexpected error occurred.',
          requestId: 'request-123',
        },
      }),
    ).toEqual({
      error: {
        code: 'INTERNAL_SERVER_ERROR',
        message: 'An unexpected error occurred.',
        requestId: 'request-123',
      },
    });
  });
});

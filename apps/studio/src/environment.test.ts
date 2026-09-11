import { describe, expect, it } from 'vitest';

import { parseStudioEnvironment } from './environment';

describe('Studio environment', () => {
  it('uses safe server-side local defaults', () => {
    expect(parseStudioEnvironment({})).toEqual({
      API_BASE_URL: 'http://localhost:4000',
      API_REQUEST_TIMEOUT_MS: 5_000,
    });
  });

  it('rejects malformed service configuration', () => {
    expect(() =>
      parseStudioEnvironment({
        API_BASE_URL: '/api',
        API_REQUEST_TIMEOUT_MS: 'never',
      }),
    ).toThrow(/API_BASE_URL|API_REQUEST_TIMEOUT_MS/);
  });
});

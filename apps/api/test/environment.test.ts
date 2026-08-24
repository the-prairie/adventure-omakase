import { describe, expect, it } from 'vitest';

import { parseApiEnvironment } from '../src/environment.js';

describe('API environment', () => {
  it('provides safe non-secret local defaults', () => {
    expect(
      parseApiEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      }),
    ).toMatchObject({
      API_HOST: '0.0.0.0',
      API_PORT: 4000,
      NODE_ENV: 'development',
    });
  });

  it('rejects malformed ports and database URLs', () => {
    expect(() =>
      parseApiEnvironment({ DATABASE_URL: 'not-a-url', API_PORT: 'outside' }),
    ).toThrow(/DATABASE_URL|API_PORT/);
  });
});

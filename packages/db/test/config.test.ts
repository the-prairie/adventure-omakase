import { describe, expect, it } from 'vitest';

import { parseDatabaseEnvironment } from '../src/environment.js';

describe('database environment', () => {
  it('accepts a PostgreSQL URL', () => {
    expect(
      parseDatabaseEnvironment({
        DATABASE_URL: 'postgresql://user:password@localhost:5432/database',
      }).DATABASE_URL,
    ).toBe('postgresql://user:password@localhost:5432/database');
  });

  it('rejects a missing database URL with an actionable issue', () => {
    expect(() => parseDatabaseEnvironment({})).toThrow(/DATABASE_URL/);
  });
});

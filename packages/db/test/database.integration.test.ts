import { afterAll, describe, expect, it } from 'vitest';

import { createDatabase } from '../src/index.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for database integration tests. Copy .env.example to .env and run pnpm infra:up before pnpm test:integration.',
  );
}

const database = createDatabase({ databaseUrl });

describe('database integration', () => {
  afterAll(async () => {
    await database.close();
  });

  it('connects to a clean migrated PostGIS database', async () => {
    await expect(database.check()).resolves.toBeUndefined();
    await expect(database.hasPostgis()).resolves.toBe(true);
  });
});

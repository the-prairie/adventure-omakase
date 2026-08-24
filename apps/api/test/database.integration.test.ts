import { createDatabase } from '@adventure-omakase/db';
import { afterAll, describe, expect, it } from 'vitest';

import { buildApp } from '../src/app.js';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error(
    'DATABASE_URL is required for API integration tests. Copy .env.example to .env and run pnpm infra:up before pnpm test:integration.',
  );
}

const database = createDatabase({ databaseUrl });
const app = await buildApp({ database, logger: false });

describe('API database integration', () => {
  afterAll(async () => {
    await app.close();
  });

  it('reports ready against a migrated database', async () => {
    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toEqual({
      status: 'ready',
      dependencies: { database: 'available' },
    });
  });
});

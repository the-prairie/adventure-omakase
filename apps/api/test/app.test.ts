import {
  errorResponseSchema,
  healthResponseSchema,
  readinessResponseSchema,
} from '@adventure-omakase/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { buildApp, type DatabaseDependency } from '../src/app.js';

function databaseThat(
  result: 'available' | 'postgis-unavailable' | 'unavailable',
): DatabaseDependency {
  return {
    check:
      result !== 'unavailable'
        ? vi.fn().mockResolvedValue(undefined)
        : vi.fn().mockRejectedValue(new Error('connection refused')),
    close: vi.fn().mockResolvedValue(undefined),
    hasPostgis: vi.fn().mockResolvedValue(result !== 'postgis-unavailable'),
  };
}

const apps: Awaited<ReturnType<typeof buildApp>>[] = [];

afterEach(async () => {
  await Promise.all(apps.splice(0).map((app) => app.close()));
});

describe('GET /health', () => {
  it('serves the shared health contract without probing dependencies', async () => {
    const database = databaseThat('unavailable');
    const app = await buildApp({ database, logger: false });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/health' });

    expect(response.statusCode).toBe(200);
    expect(healthResponseSchema.parse(response.json())).toMatchObject({
      status: 'ok',
      service: 'adventure-omakase-api',
    });
    expect(database.check).not.toHaveBeenCalled();
  });
});

describe('GET /ready', () => {
  it('reports ready when the database is available', async () => {
    const app = await buildApp({
      database: databaseThat('available'),
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(200);
    expect(readinessResponseSchema.parse(response.json())).toEqual({
      status: 'ready',
      dependencies: { database: 'available' },
    });
  });

  it('reports unavailable without leaking connection details', async () => {
    const app = await buildApp({
      database: databaseThat('unavailable'),
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(response.body).not.toContain('connection refused');
    expect(readinessResponseSchema.parse(response.json())).toEqual({
      status: 'not_ready',
      dependencies: { database: 'unavailable' },
    });
  });

  it('reports unavailable when the PostGIS capability is missing', async () => {
    const app = await buildApp({
      database: databaseThat('postgis-unavailable'),
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/ready' });

    expect(response.statusCode).toBe(503);
    expect(readinessResponseSchema.parse(response.json())).toEqual({
      status: 'not_ready',
      dependencies: { database: 'unavailable' },
    });
  });
});

describe('error handling', () => {
  it('returns the stable error shape for unknown routes', async () => {
    const app = await buildApp({
      database: databaseThat('available'),
      logger: false,
    });
    apps.push(app);

    const response = await app.inject({ method: 'GET', url: '/missing' });

    expect(response.statusCode).toBe(404);
    expect(errorResponseSchema.parse(response.json())).toMatchObject({
      error: { code: 'NOT_FOUND', message: 'Route not found.' },
    });
  });
});

import {
  healthResponseSchema,
  readinessResponseSchema,
  type ErrorResponse,
  type HealthResponse,
  type ReadinessResponse,
} from '@adventure-omakase/contracts';
import cors from '@fastify/cors';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import Fastify, { type FastifyBaseLogger } from 'fastify';
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
} from 'fastify-type-provider-zod';

import {
  parseApiRuntimeEnvironment,
  type ApiRuntimeEnvironment,
} from './environment.js';

export interface DatabaseDependency {
  check: () => Promise<void>;
  close: () => Promise<void>;
  hasPostgis: () => Promise<boolean>;
}

interface BuildAppOptions {
  database: DatabaseDependency;
  environment?: ApiRuntimeEnvironment;
  logger?: boolean | FastifyBaseLogger;
}

export async function buildApp(options: BuildAppOptions) {
  const environment =
    options.environment ?? parseApiRuntimeEnvironment(process.env);
  const app = Fastify({
    logger:
      options.logger ??
      (environment.NODE_ENV === 'development'
        ? {
            level: environment.LOG_LEVEL,
            transport: { target: 'pino-pretty', options: { colorize: true } },
          }
        : { level: environment.LOG_LEVEL }),
  });

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);

  await app.register(cors, {
    origin: environment.API_CORS_ORIGINS.split(',').map((origin) =>
      origin.trim(),
    ),
  });

  if (environment.NODE_ENV === 'development') {
    await app.register(swagger, {
      openapi: {
        info: {
          title: 'Adventure Omakase API',
          version: environment.APP_VERSION,
        },
      },
      transform: jsonSchemaTransform,
    });
    await app.register(swaggerUi, { routePrefix: '/docs' });
  }

  app.get(
    '/health',
    { schema: { response: { 200: healthResponseSchema } } },
    (): HealthResponse => ({
      status: 'ok',
      service: 'adventure-omakase-api',
      version: environment.APP_VERSION,
      commitSha: environment.GIT_SHA,
    }),
  );

  app.get(
    '/ready',
    {
      schema: {
        response: {
          200: readinessResponseSchema,
          503: readinessResponseSchema,
        },
      },
    },
    async (_request, reply): Promise<ReadinessResponse> => {
      try {
        await options.database.check();
        if (!(await options.database.hasPostgis())) {
          throw new Error('Required PostGIS extension is unavailable.');
        }
        return { status: 'ready', dependencies: { database: 'available' } };
      } catch (error) {
        app.log.warn({ error }, 'Database readiness check failed');
        void reply.code(503);
        return {
          status: 'not_ready',
          dependencies: { database: 'unavailable' },
        };
      }
    },
  );

  app.setNotFoundHandler((request, reply): ErrorResponse => {
    void reply.code(404);
    return {
      error: {
        code: 'NOT_FOUND',
        message: 'Route not found.',
        requestId: request.id,
      },
    };
  });

  app.setErrorHandler((error, request, reply): ErrorResponse => {
    const isValidationError =
      typeof error === 'object' && error !== null && 'validation' in error;
    const statusCode = isValidationError ? 400 : 500;
    const code = isValidationError
      ? 'VALIDATION_ERROR'
      : 'INTERNAL_SERVER_ERROR';
    const message = isValidationError
      ? 'The request is invalid.'
      : 'An unexpected error occurred.';
    request.log.error({ error }, 'Request failed');
    void reply.code(statusCode);
    return { error: { code, message, requestId: request.id } };
  });

  app.addHook('onClose', async () => options.database.close());

  return app;
}

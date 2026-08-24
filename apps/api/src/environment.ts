import { z } from 'zod';

const runtimeEnvironmentSchema = z.object({
  NODE_ENV: z
    .enum(['development', 'test', 'production'])
    .default('development'),
  API_HOST: z.string().min(1).default('0.0.0.0'),
  API_PORT: z.coerce.number().int().min(1).max(65_535).default(4000),
  API_CORS_ORIGINS: z.string().default('http://localhost:3000'),
  LOG_LEVEL: z
    .enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent'])
    .default('info'),
  APP_VERSION: z.string().min(1).default('0.0.0'),
  GIT_SHA: z.string().min(1).default('local'),
});

const apiEnvironmentSchema = runtimeEnvironmentSchema.extend({
  DATABASE_URL: z.url().refine((value) => value.startsWith('postgresql://'), {
    message: 'DATABASE_URL must use the postgresql:// protocol.',
  }),
});

export type ApiRuntimeEnvironment = z.infer<typeof runtimeEnvironmentSchema>;
export type ApiEnvironment = z.infer<typeof apiEnvironmentSchema>;

export function parseApiRuntimeEnvironment(
  environment: Record<string, string | undefined>,
): ApiRuntimeEnvironment {
  return runtimeEnvironmentSchema.parse(environment);
}

export function parseApiEnvironment(
  environment: Record<string, string | undefined>,
): ApiEnvironment {
  return apiEnvironmentSchema.parse(environment);
}

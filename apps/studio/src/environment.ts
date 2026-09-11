import { z } from 'zod';

const studioEnvironmentSchema = z.object({
  API_BASE_URL: z.url().default('http://localhost:4000'),
  API_REQUEST_TIMEOUT_MS: z.coerce
    .number()
    .int()
    .positive()
    .max(60_000)
    .default(5_000),
});

export type StudioEnvironment = z.infer<typeof studioEnvironmentSchema>;

export function parseStudioEnvironment(
  environment: Record<string, string | undefined>,
): StudioEnvironment {
  return studioEnvironmentSchema.parse(environment);
}

import { z } from 'zod';

const databaseEnvironmentSchema = z.object({
  DATABASE_URL: z.url().refine((value) => value.startsWith('postgresql://'), {
    message: 'DATABASE_URL must use the postgresql:// protocol.',
  }),
});

export type DatabaseEnvironment = z.infer<typeof databaseEnvironmentSchema>;

export function parseDatabaseEnvironment(
  environment: Record<string, string | undefined>,
): DatabaseEnvironment {
  return databaseEnvironmentSchema.parse(environment);
}

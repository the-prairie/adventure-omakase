import { z } from 'zod';

const mobileEnvironmentSchema = z.object({
  EXPO_PUBLIC_API_BASE_URL: z.url().default('http://localhost:4000'),
});

export type MobileEnvironment = z.infer<typeof mobileEnvironmentSchema>;

export function parseMobileEnvironment(
  environment: Record<string, string | undefined>,
): MobileEnvironment {
  return mobileEnvironmentSchema.parse(environment);
}

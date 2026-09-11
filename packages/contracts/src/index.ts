import { z } from 'zod';

export const healthResponseSchema = z
  .object({
    status: z.literal('ok'),
    service: z.literal('adventure-omakase-api'),
    version: z.string().min(1),
    commitSha: z.string().min(1).optional(),
  })
  .strict();

export const readinessResponseSchema = z
  .object({
    status: z.enum(['ready', 'not_ready']),
    dependencies: z
      .object({
        database: z.enum(['available', 'unavailable']),
      })
      .strict(),
  })
  .strict();

export const errorResponseSchema = z
  .object({
    error: z
      .object({
        code: z.string().min(1),
        message: z.string().min(1),
        requestId: z.string().min(1),
      })
      .strict(),
  })
  .strict();

export type HealthResponse = z.infer<typeof healthResponseSchema>;
export type ReadinessResponse = z.infer<typeof readinessResponseSchema>;
export type ErrorResponse = z.infer<typeof errorResponseSchema>;

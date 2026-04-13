import { z } from 'zod';
import { zodSchema } from '../common/zod-body.pipe';

export const DecisionModeSchema = zodSchema(z.enum(['top5', 'roulette']));

export const CreateDecisionSessionSchema = zodSchema(
  z
    .object({
      mode: DecisionModeSchema.optional().default('top5'),
      constraints: z.record(z.string(), z.unknown()).optional().default({}),
    })
    .strict(),
);

export const DecisionSessionIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const PickDecisionSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive(),
    })
    .strict(),
);

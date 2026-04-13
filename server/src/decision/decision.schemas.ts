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

export const PublicTokenParamSchema = zodSchema(
  z.object({ token: z.string().min(32).max(96) }).strict(),
);

export const PublicVoteBodySchema = zodSchema(
  z
    .object({
      voterKey: z.string().min(8).max(128),
      tmdbId: z.number().int().positive(),
    })
    .strict(),
);

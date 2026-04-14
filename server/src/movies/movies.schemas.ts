import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const MoviesTmdbIdParamSchema = zodSchema(
  z.object({ tmdbId: z.coerce.number().int().positive() }).strict(),
);

export const MovieReleasesQuerySchema = zodSchema(
  z
    .object({
      region: z
        .string()
        .trim()
        .optional()
        .transform((v) => (v ?? '').trim().toUpperCase())
        .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), {
          message: 'Invalid region',
        }),
    })
    .strict(),
);

export const RefreshFeaturesQuerySchema = zodSchema(
  z
    .object({
      language: z.string().trim().optional().default(''),
    })
    .strict(),
);

export const RefreshFeaturesBatchSchema = zodSchema(
  z
    .object({
      tmdbIds: z.array(z.number().int().positive()).min(1).max(50),
      language: z.string().trim().optional().default(''),
    })
    .strict(),
);

export const CreateEmbeddingsJobSchema = zodSchema(
  z
    .object({
      tmdbIds: z.array(z.number().int().positive()).min(1).max(200),
    })
    .strict(),
);

export const MovieFeatureJobIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

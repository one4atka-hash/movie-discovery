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

import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const SimilarToQuerySchema = zodSchema(
  z
    .object({
      tmdbId: z.coerce.number().int().positive(),
    })
    .strict(),
);

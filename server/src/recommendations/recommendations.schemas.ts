import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const RecommendFeedbackSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive(),
      action: z.enum(['more', 'less', 'hide']),
    })
    .strict(),
);

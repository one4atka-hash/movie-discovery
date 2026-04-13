import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const TmdbIdParamSchema = zodSchema(
  z.object({ tmdbId: z.coerce.number().int().positive() }).strict(),
);

export const WatchStatusSchema = zodSchema(
  z.enum(['want', 'watching', 'watched', 'dropped', 'hidden']),
);

export const ProgressSchema = zodSchema(
  z
    .object({
      minutes: z.number().int().nonnegative().optional().nullable(),
      pct: z.number().min(0).max(100).optional().nullable(),
    })
    .strict(),
);

export const PutWatchStateSchema = zodSchema(
  z
    .object({
      status: WatchStatusSchema,
      progress: ProgressSchema.optional().nullable(),
      // Optional optimistic concurrency token from client (ISO string).
      // If provided and server has a newer updated_at, caller can resolve conflicts.
      ifUnmodifiedSince: z.string().datetime().optional().nullable(),
    })
    .strict(),
);

export const BulkWatchStateSchema = zodSchema(
  z
    .object({
      items: z
        .array(
          z
            .object({
              tmdbId: z.number().int().positive(),
              status: z.enum([
                'want',
                'watching',
                'watched',
                'dropped',
                'hidden',
              ]),
              progress: ProgressSchema.optional().nullable(),
            })
            .strict(),
        )
        .min(1)
        .max(200),
    })
    .strict(),
);

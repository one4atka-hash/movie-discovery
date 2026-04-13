import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const AvailabilityTrackSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive(),
      region: z.string().trim().min(2).max(8).optional().default('US'),
    })
    .strict(),
);

export const AvailabilityIngestSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive(),
      region: z.string().trim().min(2).max(8).optional().default('US'),
      providers: z.array(z.string().trim().min(1).max(120)).max(200),
      fetchedAt: z.string().datetime().optional(),
    })
    .strict(),
);

export const AvailabilityEventsQuerySchema = zodSchema(
  z
    .object({
      since: z.string().datetime(),
    })
    .strict(),
);

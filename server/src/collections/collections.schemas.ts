import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const CollectionVisibilitySchema = zodSchema(
  z.enum(['private', 'unlisted', 'public']),
);

export const CollectionUpsertSchema = zodSchema(
  z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().trim().min(1).max(80),
      description: z.string().trim().max(400).optional().nullable(),
      visibility: CollectionVisibilitySchema.optional().default('private'),
    })
    .strict(),
);

export const CollectionIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const ItemIdParamSchema = zodSchema(
  z.object({ itemId: z.string().uuid() }).strict(),
);

export const ItemCreateSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive().optional().nullable(),
      title: z.string().trim().min(1).max(200),
      note: z.string().trim().max(800).optional().nullable(),
    })
    .strict(),
);

import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const DiaryLocationSchema = zodSchema(
  z.enum(['cinema', 'streaming', 'home']),
);

export const DiaryEntryUpsertSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive().optional().nullable(),
      title: z.string().trim().min(1).max(200),
      watchedAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      location: DiaryLocationSchema,
      providerKey: z.string().trim().max(80).optional().nullable(),
      rating: z.number().min(0).max(10).optional().nullable(),
      tags: z
        .array(z.string().trim().min(1).max(40))
        .max(30)
        .optional()
        .nullable(),
      note: z.string().max(2000).optional().nullable(),
    })
    .strict(),
);

export const DiaryIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const DiaryQuerySchema = zodSchema(
  z
    .object({
      from: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
      to: z
        .string()
        .regex(/^\d{4}-\d{2}-\d{2}$/)
        .optional(),
    })
    .strict(),
);

export const DiaryStatsQuerySchema = zodSchema(
  z
    .object({
      year: z.coerce.number().int().min(1900).max(2100),
    })
    .strict(),
);

export const DiaryExportQuerySchema = zodSchema(
  z
    .object({
      format: z.enum(['csv', 'json']).default('json'),
      year: z.coerce.number().int().min(1900).max(2100).optional(),
    })
    .strict(),
);

/** Same payload shape as `POST /api/imports` with kind fixed to `diary`. */
export const DiaryImportBodySchema = zodSchema(
  z
    .object({
      format: z.enum(['json', 'csv']),
      payload: z.string().max(200_000).optional().nullable(),
    })
    .strict(),
);

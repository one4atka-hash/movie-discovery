import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

/** URL-safe slug (lowercase, digits, hyphens). */
export const PublicSlugSchema = z
  .string()
  .trim()
  .min(3)
  .max(32)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);

const SectionsSchema = z
  .object({
    favorites: z.boolean().optional(),
    diary: z.boolean().optional(),
    watchlist: z.boolean().optional(),
  })
  .strict()
  .transform((s) => ({
    favorites: Boolean(s.favorites),
    diary: Boolean(s.diary),
    watchlist: Boolean(s.watchlist),
  }));

const ContentSchema = z
  .object({
    about: z.string().trim().max(800).optional().default(''),
    notes: z.string().trim().max(800).optional().default(''),
    plans: z.string().trim().max(800).optional().default(''),
  })
  .strict()
  .transform((c) => ({
    about: c.about.trim(),
    notes: c.notes.trim(),
    plans: c.plans.trim(),
  }));

export const PublicProfilePutSchema = zodSchema(
  z
    .object({
      slug: z.union([PublicSlugSchema, z.null()]),
      enabled: z.boolean(),
      visibility: z.enum(['private', 'unlisted', 'public']),
      sections: SectionsSchema,
      content: ContentSchema.optional().default({
        about: '',
        notes: '',
        plans: '',
      }),
    })
    .strict()
    .superRefine((val, ctx) => {
      if (
        val.enabled &&
        val.visibility !== 'private' &&
        (val.slug === undefined || val.slug === null)
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'slug required when profile is enabled and not private',
          path: ['slug'],
        });
      }
    }),
);

export const PublicSlugParamSchema = zodSchema(
  z.object({ slug: PublicSlugSchema }).strict(),
);

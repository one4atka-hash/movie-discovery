import { z } from 'zod';

export const StreamingProvidersQuerySchema = z.object({
  region: z
    .string()
    .optional()
    .transform((v) => (v ?? '').trim().toUpperCase())
    .refine((v) => v === '' || /^[A-Z]{2}$/.test(v), {
      message: 'Invalid region',
    })
    .default(''),
});

export type StreamingProvidersQuery = z.infer<
  typeof StreamingProvidersQuerySchema
>;

export const TmdbWatchProvidersCatalogSchema = z.object({
  results: z.array(
    z.object({
      provider_id: z.number().int().positive(),
      provider_name: z.string().min(1),
      logo_path: z.string().nullable().optional(),
      display_priority: z.number().int().optional(),
    }),
  ),
});

export type TmdbWatchProvidersCatalog = z.infer<
  typeof TmdbWatchProvidersCatalogSchema
>;

/** TMDB GET /movie/{id}/watch/providers — per-country blocks. */
const TmdbNamedProviderSchema = z.object({
  provider_name: z.string(),
});

const TmdbCountryProvidersSchema = z.object({
  flatrate: z.array(TmdbNamedProviderSchema).optional(),
  rent: z.array(TmdbNamedProviderSchema).optional(),
  buy: z.array(TmdbNamedProviderSchema).optional(),
});

export const TmdbMovieWatchProvidersResponseSchema = z.object({
  results: z.record(z.string(), TmdbCountryProvidersSchema).optional(),
});

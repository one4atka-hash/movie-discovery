import { z } from 'zod';
import { zodSchema } from '../common/zod-body.pipe';

export const ImportKindSchema = zodSchema(
  z.enum(['diary', 'watch_state', 'favorites']),
);
export const ImportFormatSchema = zodSchema(z.enum(['json', 'csv']));

export const CreateImportSchema = zodSchema(
  z
    .object({
      kind: ImportKindSchema,
      format: ImportFormatSchema,
      // MVP placeholder: store a small inline payload for now (later: multipart upload to object storage).
      payload: z.string().max(200_000).optional().nullable(),
    })
    .strict(),
);

export const ImportIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const ImportRowParamSchema = zodSchema(
  z
    .object({ id: z.string().uuid(), rowN: z.coerce.number().int().min(1) })
    .strict(),
);

export const ImportRowsQuerySchema = zodSchema(
  z
    .object({
      offset: z.coerce.number().int().min(0).optional(),
      limit: z.coerce.number().int().min(1).max(200).optional(),
    })
    .strict(),
);

export const ImportConflictsQuerySchema = ImportRowsQuerySchema;

export const ResolveImportRowSchema = zodSchema(
  z
    .object({
      status: z.enum(['ok', 'error', 'pending', 'conflict']).optional(),
      mapped: z.unknown().optional().nullable(),
      error: z.string().max(5000).optional().nullable(),
    })
    .strict(),
);

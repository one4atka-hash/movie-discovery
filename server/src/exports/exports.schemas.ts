import { z } from 'zod';
import { zodSchema } from '../common/zod-body.pipe';

export const ExportKindSchema = zodSchema(
  z.enum(['diary', 'watch_state', 'favorites']),
);
export const ExportFormatSchema = zodSchema(z.enum(['json', 'csv']));

export const ExportQuerySchema = zodSchema(
  z
    .object({
      kind: ExportKindSchema,
      format: ExportFormatSchema,
      year: z.coerce.number().int().min(1900).max(2100).optional(),
    })
    .strict(),
);

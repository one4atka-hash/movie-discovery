import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const AlertRuleFiltersSchema = zodSchema(
  z
    .object({
      minRating: z.number().min(0).max(10).optional().nullable(),
      genres: z.array(z.string().min(1)).max(30).optional().nullable(),
      maxRuntime: z.number().int().positive().optional().nullable(),
      languages: z.array(z.string().min(1)).max(30).optional().nullable(),
      providerKeys: z.array(z.string().min(1)).max(50).optional().nullable(),
    })
    .strict()
    .default({}),
);

export const AlertRuleChannelsSchema = zodSchema(
  z
    .object({
      inApp: z.boolean().optional(),
      webPush: z.boolean().optional(),
      email: z.boolean().optional(),
      calendar: z.boolean().optional(),
    })
    .strict()
    .transform((c) => ({
      inApp: Boolean(c.inApp),
      webPush: Boolean(c.webPush),
      email: Boolean(c.email),
      calendar: Boolean(c.calendar),
    })),
);

export const QuietHoursSchema = zodSchema(
  z
    .object({
      start: z.string().regex(/^\d{2}:\d{2}$/),
      end: z.string().regex(/^\d{2}:\d{2}$/),
      tz: z.string().min(1).max(64),
    })
    .strict(),
);

export const UpsertAlertRuleSchema = zodSchema(
  z
    .object({
      id: z.string().uuid().optional(),
      name: z.string().min(1).max(80),
      enabled: z.boolean().optional().default(true),
      filters: AlertRuleFiltersSchema.optional().default({}),
      channels: AlertRuleChannelsSchema,
      quietHours: QuietHoursSchema.optional().nullable(),
    })
    .strict(),
);

export const IdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const PaginationSchema = zodSchema(
  z
    .object({
      limit: z.coerce.number().int().positive().max(100).optional().default(30),
      cursor: z.string().uuid().optional(),
    })
    .strict(),
);

import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

const ChannelsSchema = z
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
  }));

const WindowSchema = z
  .object({
    daysBefore: z.number().int().min(0).max(365),
  })
  .strict();

export const CreateReleaseReminderSchema = zodSchema(
  z
    .object({
      tmdbId: z.number().int().positive(),
      mediaType: z.literal('movie'),
      reminderType: z.enum(['theatrical', 'digital', 'physical', 'any']),
      window: WindowSchema,
      channels: ChannelsSchema,
    })
    .strict(),
);

export const ReleaseReminderIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

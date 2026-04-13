import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const PushSubscribeSchema = zodSchema(
  z
    .object({
      endpoint: z.string().url().max(4096),
      keys: z
        .object({
          p256dh: z.string().min(1).max(4096),
          auth: z.string().min(1).max(512),
        })
        .strict(),
    })
    .strict(),
);

export const PushSubIdParamSchema = zodSchema(
  z.object({ id: z.string().uuid() }).strict(),
);

export const PushDevSendSelfSchema = zodSchema(
  z.preprocess(
    (v) => (v == null || typeof v !== 'object' ? {} : v),
    z
      .object({
        title: z.string().min(1).max(120).optional(),
        body: z.string().max(500).optional(),
      })
      .strict(),
  ),
);

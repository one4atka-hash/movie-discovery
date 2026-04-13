import { z } from 'zod';

import { zodSchema } from '../common/zod-body.pipe';

export const StreamingPrefsSchema = zodSchema(
  z
    .object({
      region: z
        .string()
        .trim()
        .toUpperCase()
        .regex(/^[A-Z]{2}$/)
        .default('US'),
      providers: z
        .array(z.string().trim().min(1).max(80))
        .max(50)
        .default([])
        .transform((arr) => uniqCi(arr)),
    })
    .strict(),
);

function uniqCi(arr: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(s.trim());
  }
  return out;
}

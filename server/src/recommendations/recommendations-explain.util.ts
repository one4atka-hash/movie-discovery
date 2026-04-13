export type RecExplainItem = { key: string; params?: Record<string, string> };

export type BuildExplainOptions = {
  maxItems: number;
};

/**
 * i18n-ready explain generator:
 * - emits stable keys (not user-facing strings)
 * - limits items count for UI stability
 */
export function buildExplain(
  input: { seedCount: number; mode: 'mvp' | 'ann' },
  opts: BuildExplainOptions,
): RecExplainItem[] {
  const out: RecExplainItem[] = [];

  out.push({
    key: 'recs.seed',
    params: { seedCount: String(Math.max(0, Math.trunc(input.seedCount))) },
  });

  if (input.mode === 'mvp') {
    out.push({ key: 'recs.mode.mvp' });
  } else {
    out.push({ key: 'recs.mode.ann' });
  }

  return out.slice(0, Math.max(0, Math.trunc(opts.maxItems)));
}

export type RuleFilters = {
  readonly minRating?: number | null;
  readonly genres?: readonly string[] | null;
  readonly maxRuntime?: number | null;
  readonly languages?: readonly string[] | null;
  readonly providerKeys?: readonly string[] | null;
};

export type QuietHours = {
  /** HH:MM */
  readonly start: string;
  /** HH:MM */
  readonly end: string;
  /** IANA TZ, MVP: not used in calculation (server runs UTC). */
  readonly tz: string;
};

export type Candidate = {
  readonly rating?: number | null;
  readonly runtimeMinutes?: number | null;
  readonly genres?: readonly string[] | null;
  readonly language?: string | null;
  readonly providerKeys?: readonly string[] | null;
};

export function matchesFilters(c: Candidate, f: RuleFilters): boolean {
  if (f.minRating != null) {
    const r = c.rating ?? null;
    if (r == null || r < f.minRating) return false;
  }

  if (f.maxRuntime != null) {
    const rt = c.runtimeMinutes ?? null;
    if (rt == null || rt > f.maxRuntime) return false;
  }

  if (f.languages?.length) {
    const lang = (c.language ?? '').trim().toLowerCase();
    if (!lang) return false;
    const allow = new Set(
      f.languages.map((x) => x.trim().toLowerCase()).filter(Boolean),
    );
    if (!allow.has(lang)) return false;
  }

  if (f.genres?.length) {
    const have = new Set(
      (c.genres ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean),
    );
    const want = f.genres.map((x) => x.trim().toLowerCase()).filter(Boolean);
    if (!want.some((g) => have.has(g))) return false;
  }

  if (f.providerKeys?.length) {
    const have = new Set(
      (c.providerKeys ?? []).map((x) => x.trim().toLowerCase()).filter(Boolean),
    );
    const want = f.providerKeys
      .map((x) => x.trim().toLowerCase())
      .filter(Boolean);
    if (!want.some((p) => have.has(p))) return false;
  }

  return true;
}

/** Returns true if `now` is inside quiet hours window. */
export function isInQuietHours(
  now: Date,
  q: QuietHours | null | undefined,
): boolean {
  if (!q) return false;
  const start = parseHm(q.start);
  const end = parseHm(q.end);
  if (start == null || end == null) return false;

  const minutesNow = now.getUTCHours() * 60 + now.getUTCMinutes();
  if (start === end) return true; // 24h quiet

  // Same-day window: [start, end)
  if (start < end) return minutesNow >= start && minutesNow < end;
  // Overnight: [start, 24h) U [0, end)
  return minutesNow >= start || minutesNow < end;
}

function parseHm(s: string): number | null {
  const m = /^(\d{2}):(\d{2})$/.exec(s.trim());
  if (!m) return null;
  const hh = Number(m[1]);
  const mm = Number(m[2]);
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  if (hh < 0 || hh > 23) return null;
  if (mm < 0 || mm > 59) return null;
  return hh * 60 + mm;
}

/**
 * Pure helpers for mapping a TMDB release calendar date to a reminder trigger date
 * and for deciding whether a cron job should enqueue a notification (no double-send same day).
 */

function parseYmd(s: string): Date {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s.trim());
  if (!m) {
    throw new Error('Invalid YYYY-MM-DD date');
  }
  const y = Number(m[1]);
  const mo = Number(m[2]);
  const d = Number(m[3]);
  return new Date(Date.UTC(y, mo - 1, d));
}

function toYmdUtc(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Calendar day `daysBefore` before `releaseDateYmd` (UTC date math). */
export function reminderTriggerDate(
  releaseDateYmd: string,
  daysBefore: number,
): string {
  const d = parseYmd(releaseDateYmd);
  d.setUTCDate(d.getUTCDate() - daysBefore);
  return toYmdUtc(d);
}

/**
 * Returns true when `todayYmd` is the trigger day and we have not already notified on that day.
 */
export function shouldEnqueueReminder(input: {
  todayYmd: string;
  releaseDateYmd: string;
  daysBefore: number;
  lastNotifiedOnYmd: string | null;
}): boolean {
  const trigger = reminderTriggerDate(input.releaseDateYmd, input.daysBefore);
  if (input.todayYmd !== trigger) return false;
  if (input.lastNotifiedOnYmd === input.todayYmd) return false;
  return true;
}

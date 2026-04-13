import type { AlertRule, InboxExplain } from './inbox.model';

/** Единый генератор «Why» из тех же полей, что и rule editor (MVP). */
export function inboxExplainFromRuleClauses(
  name: string,
  filters: AlertRule['filters'],
  channels: AlertRule['channels'],
): InboxExplain[] {
  const out: InboxExplain[] = [];
  const title = name.trim() || 'Untitled rule';
  out.push({ label: 'Rule', detail: title });

  const f = filters;
  if (f.minRating != null && Number.isFinite(f.minRating)) {
    out.push({ label: 'Min rating', detail: `≥ ${f.minRating}` });
  }
  if (f.maxRuntime != null && Number.isFinite(f.maxRuntime)) {
    out.push({ label: 'Max runtime', detail: `≤ ${f.maxRuntime} min` });
  }
  const genres = f.genres?.length ? [...f.genres].sort((a, b) => a - b).join(', ') : '';
  if (genres) out.push({ label: 'Genres (TMDB ids)', detail: genres });
  const langs = f.languages?.length ? [...f.languages].sort().join(', ') : '';
  if (langs) out.push({ label: 'Languages', detail: langs });
  const prov = f.providerKeys?.length ? [...f.providerKeys].sort().join(', ') : '';
  if (prov) out.push({ label: 'Providers', detail: prov });

  const ch: string[] = [];
  if (channels.inApp) ch.push('in-app');
  if (channels.webPush) ch.push('web push');
  if (channels.email) ch.push('email');
  if (channels.calendar) ch.push('calendar');
  out.push({ label: 'Channels', detail: ch.length ? ch.join(' · ') : 'none' });

  return out;
}

export const INBOX_DEMO_RULE_FOR_SAMPLE: Pick<AlertRule, 'name' | 'filters' | 'channels'> = {
  name: 'Demo rule',
  filters: {
    minRating: 7,
    genres: [28, 12],
    maxRuntime: 140,
    languages: ['en'],
    providerKeys: null,
  },
  channels: {
    inApp: true,
    webPush: false,
    email: false,
    calendar: false,
  },
};

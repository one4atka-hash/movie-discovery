/** Minimal single-day VEVENT for a TMDB-style YYYY-MM-DD release date. */
export function buildReleaseIcs(input: { title: string; date: string }): string {
  const dt = input.date.replace(/-/g, '');
  const uid = `${crypto.randomUUID()}@movie-discovery`;
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//MovieDiscovery//ReleaseReminder//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:${uid}`,
    `DTSTAMP:${dt}T090000Z`,
    `DTSTART;VALUE=DATE:${dt}`,
    `SUMMARY:${escapeIcsText(input.title)}`,
    'END:VEVENT',
    'END:VCALENDAR',
    '',
  ].join('\r\n');
}

export function escapeIcsText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/\n/g, '\\n').replace(/,/g, '\\,').replace(/;/g, '\\;');
}

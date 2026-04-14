function icsEscapeText(s: string): string {
  // RFC 5545: escape backslash, semicolon, comma, and newlines.
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function ymdHmsUtc(date: Date): string {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, '0');
  const d = String(date.getUTCDate()).padStart(2, '0');
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  const ss = String(date.getUTCSeconds()).padStart(2, '0');
  return `${y}${m}${d}T${hh}${mm}${ss}Z`;
}

export type IcsEventInput = {
  uid: string;
  dtstamp: Date;
  dtstart: Date;
  summary: string;
  description?: string | null;
};

export function buildIcsCalendar(input: {
  prodId: string;
  name: string;
  events: readonly IcsEventInput[];
}): string {
  // CRLF is required by the spec; many clients are tolerant, but we keep it correct.
  const lines: string[] = [];
  lines.push('BEGIN:VCALENDAR');
  lines.push('VERSION:2.0');
  lines.push(`PRODID:${input.prodId}`);
  lines.push('CALSCALE:GREGORIAN');
  lines.push('METHOD:PUBLISH');
  lines.push(`X-WR-CALNAME:${icsEscapeText(input.name)}`);

  for (const e of input.events) {
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${icsEscapeText(e.uid)}`);
    lines.push(`DTSTAMP:${ymdHmsUtc(e.dtstamp)}`);
    lines.push(`DTSTART:${ymdHmsUtc(e.dtstart)}`);
    lines.push(`SUMMARY:${icsEscapeText(e.summary)}`);
    if (e.description) {
      lines.push(`DESCRIPTION:${icsEscapeText(e.description)}`);
    }
    lines.push('END:VEVENT');
  }

  lines.push('END:VCALENDAR');
  return `${lines.join('\r\n')}\r\n`;
}

/** Флаг страны по региональному коду ISO 3166-1 alpha-2 (как в `en-US` → US). */

export function regionCodeToFlagEmoji(region: string): string {
  const r = region.trim().toUpperCase();
  if (r.length !== 2 || !/^[A-Z]{2}$/.test(r)) return '🌐';
  const A = 0x1f1e6;
  const chars = [...r].map((c) => String.fromCodePoint(A + (c.charCodeAt(0) - 65)));
  return chars.join('');
}

/** Локаль TMDB `xx-YY` → эмодзи флага региона. */
export function localeToFlagEmoji(locale: string): string {
  const parts = locale.split('-');
  if (parts.length < 2) return '🌐';
  const region = parts[parts.length - 1] ?? '';
  return regionCodeToFlagEmoji(region);
}

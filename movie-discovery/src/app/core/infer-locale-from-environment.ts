/**
 * Первая загрузка без сохранённой локали: язык/регион по часовому поясу и настройкам браузера
 * (без GPS и без запроса геолокации).
 */

/** Частые IANA → локаль TMDB (primary_translations). */
const TIMEZONE_TO_LOCALE: Record<string, string> = {
  'Europe/Moscow': 'ru-RU',
  'Europe/Simferopol': 'ru-RU',
  'Europe/Kaliningrad': 'ru-RU',
  'Europe/Kirov': 'ru-RU',
  'Europe/Astrakhan': 'ru-RU',
  'Europe/Volgograd': 'ru-RU',
  'Europe/Samara': 'ru-RU',
  'Asia/Yekaterinburg': 'ru-RU',
  'Asia/Omsk': 'ru-RU',
  'Asia/Novosibirsk': 'ru-RU',
  'Asia/Barnaul': 'ru-RU',
  'Asia/Tomsk': 'ru-RU',
  'Asia/Novokuznetsk': 'ru-RU',
  'Asia/Krasnoyarsk': 'ru-RU',
  'Asia/Irkutsk': 'ru-RU',
  'Asia/Chita': 'ru-RU',
  'Asia/Yakutsk': 'ru-RU',
  'Asia/Khandyga': 'ru-RU',
  'Asia/Vladivostok': 'ru-RU',
  'Asia/Ust-Nera': 'ru-RU',
  'Asia/Magadan': 'ru-RU',
  'Asia/Sakhalin': 'ru-RU',
  'Asia/Srednekolymsk': 'ru-RU',
  'Asia/Kamchatka': 'ru-RU',
  'Asia/Anadyr': 'ru-RU',
  'Europe/Kyiv': 'uk-UA',
  'Europe/Kiev': 'uk-UA',
  'Europe/Minsk': 'be-BY',
  'Asia/Almaty': 'kk-KZ',
  'Asia/Aqtobe': 'kk-KZ',
  'Asia/Atyrau': 'kk-KZ',
  'Asia/Oral': 'kk-KZ',
  'Asia/Qyzylorda': 'kk-KZ',
  'Asia/Qostanay': 'kk-KZ',
  'Asia/Aqtau': 'kk-KZ',
  'Europe/Warsaw': 'pl-PL',
  'Europe/Berlin': 'de-DE',
  'Europe/Vienna': 'de-DE',
  'Europe/Zurich': 'de-CH',
  'Europe/Paris': 'fr-FR',
  'Europe/Brussels': 'nl-BE',
  'Europe/Madrid': 'es-ES',
  'Europe/Lisbon': 'pt-PT',
  'Atlantic/Azores': 'pt-PT',
  'Europe/Rome': 'it-IT',
  'Europe/Amsterdam': 'nl-NL',
  'Europe/Stockholm': 'sv-SE',
  'Europe/Oslo': 'nb-NO',
  'Europe/Copenhagen': 'da-DK',
  'Europe/Helsinki': 'fi-FI',
  'Europe/Athens': 'el-GR',
  'Europe/Bucharest': 'ro-RO',
  'Europe/Sofia': 'bg-BG',
  'Europe/Belgrade': 'sr-RS',
  'Europe/Zagreb': 'hr-HR',
  'Europe/Ljubljana': 'sl-SI',
  'Europe/Prague': 'cs-CZ',
  'Europe/Budapest': 'hu-HU',
  'Europe/Istanbul': 'tr-TR',
  'Asia/Jerusalem': 'he-IL',
  'Asia/Tel_Aviv': 'he-IL',
  'Asia/Riyadh': 'ar-SA',
  'Asia/Dubai': 'ar-AE',
  'Asia/Baghdad': 'ar-IQ',
  'Asia/Tehran': 'fa-IR',
  'Asia/Tokyo': 'ja-JP',
  'Asia/Seoul': 'ko-KR',
  'Asia/Shanghai': 'zh-CN',
  'Asia/Chongqing': 'zh-CN',
  'Asia/Urumqi': 'zh-CN',
  'Asia/Hong_Kong': 'zh-HK',
  'Asia/Taipei': 'zh-TW',
  'Asia/Singapore': 'en-SG',
  'Asia/Bangkok': 'th-TH',
  'Asia/Jakarta': 'id-ID',
  'Asia/Manila': 'fil-PH',
  'Asia/Kolkata': 'hi-IN',
  'Asia/Kathmandu': 'ne-NP',
  'Asia/Dhaka': 'bn-BD',
  'Asia/Ho_Chi_Minh': 'vi-VN',
  'Australia/Sydney': 'en-AU',
  'Australia/Melbourne': 'en-AU',
  'Pacific/Auckland': 'en-NZ',
  'America/Sao_Paulo': 'pt-BR',
  'America/Argentina/Buenos_Aires': 'es-AR',
  'America/Santiago': 'es-CL',
  'America/Bogota': 'es-CO',
  'America/Mexico_City': 'es-MX',
  'America/Toronto': 'en-CA',
  'America/Vancouver': 'en-CA',
  'America/New_York': 'en-US',
  'America/Chicago': 'en-US',
  'America/Denver': 'en-US',
  'America/Los_Angeles': 'en-US',
  'America/Phoenix': 'en-US',
  'America/Anchorage': 'en-US',
  'Pacific/Honolulu': 'en-US',
  'Europe/London': 'en-GB',
  'Europe/Dublin': 'en-IE',
  'Africa/Johannesburg': 'en-ZA',
};

const BARE_LANG_TO_LOCALE: Record<string, string> = {
  ru: 'ru-RU',
  en: 'en-US',
  de: 'de-DE',
  fr: 'fr-FR',
  es: 'es-ES',
  it: 'it-IT',
  pt: 'pt-BR',
  ja: 'ja-JP',
  ko: 'ko-KR',
  zh: 'zh-CN',
  pl: 'pl-PL',
  uk: 'uk-UA',
  tr: 'tr-TR',
  ar: 'ar-SA',
  hi: 'hi-IN',
  nl: 'nl-NL',
  sv: 'sv-SE',
  da: 'da-DK',
  fi: 'fi-FI',
  no: 'nb-NO',
  cs: 'cs-CZ',
  hu: 'hu-HU',
  ro: 'ro-RO',
  el: 'el-GR',
  he: 'he-IL',
  th: 'th-TH',
  vi: 'vi-VN',
  id: 'id-ID',
  ms: 'ms-MY',
};

export function inferLocaleFromEnvironment(): string {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (tz && TIMEZONE_TO_LOCALE[tz]) {
      return TIMEZONE_TO_LOCALE[tz]!;
    }
  } catch {
    /* ignore */
  }

  const nav = typeof navigator !== 'undefined' ? navigator : undefined;
  const langs = nav?.languages;
  const list = langs?.length ? [...langs] : nav?.language ? [nav.language] : [];

  for (const raw of list) {
    const tag = raw.trim();
    if (/^[a-z]{2}-[A-Z]{2}$/.test(tag)) {
      return tag;
    }
    const base = tag.split('-')[0]?.toLowerCase();
    if (base && BARE_LANG_TO_LOCALE[base]) {
      return BARE_LANG_TO_LOCALE[base]!;
    }
  }

  return 'en-US';
}

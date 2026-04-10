import type {
  TmdbWatchProvider,
  TmdbWatchProviderCountry,
} from '@features/movies/data-access/models/watch-providers.model';

export interface StreamingContext {
  readonly movieTitle: string;
  readonly year: string;
  readonly justWatchPageUrl: string | null;
  readonly lang: 'ru' | 'en';
}

function enc(s: string): string {
  return encodeURIComponent(s.trim());
}

type Builder = (c: StreamingContext) => string;

const BUILDERS: Record<number, Builder> = {};

function reg(ids: readonly number[], fn: Builder): void {
  for (const id of ids) {
    BUILDERS[id] = fn;
  }
}

const t = (c: StreamingContext) => enc(c.movieTitle);
const ty = (c: StreamingContext) => enc(`${c.movieTitle} ${c.year}`.trim());

/* Глобальные и западные сервисы */
reg([8, 1796, 1825], (c) => `https://www.netflix.com/search?q=${t(c)}`);
reg([9, 10, 119, 613, 2100], (c) => `https://www.primevideo.com/search?phrase=${t(c)}`);
reg([2, 350, 371], (c) => `https://tv.apple.com/search?term=${t(c)}`);
reg([3], (c) => `https://play.google.com/store/search?q=${t(c)}&c=movies`);
reg([192], (c) => `https://www.youtube.com/results?search_query=${ty(c)}`);
reg([337, 390, 725], (c) => `https://www.disneyplus.com/search?q=${t(c)}`);
reg([384, 386, 1899, 522, 425, 143], (c) => `https://www.max.com/search?q=${t(c)}`);
reg([15, 2101], (c) => `https://www.hulu.com/search?q=${t(c)}`);
reg([531, 1853], (c) => `https://www.paramountplus.com/search/?q=${t(c)}`);
reg([387], (c) => `https://www.peacocktv.com/search?q=${t(c)}`);
reg([283, 1436], (c) => `https://www.crunchyroll.com/search?q=${t(c)}`);
reg([68], (c) => `https://www.microsoft.com/store/search/movies?q=${t(c)}`);
reg([207, 1875], (c) => `https://www.roku.com/search?q=${t(c)}`);
reg([7, 278], (c) => `https://athome.fandango.com/content/browse/search?searchString=${t(c)}`);
reg([510], (c) => `https://www.discoveryplus.com/search?q=${t(c)}`);
reg([526], (c) => `https://www.amcplus.com/search?q=${t(c)}`);
reg([37], (c) => `https://www.sho.com/search?q=${t(c)}`);
reg([43], (c) => `https://www.starz.com/us/en/search?q=${t(c)}`);
reg([151], (c) => `https://www.britbox.com/search?q=${t(c)}`);
reg([11], (c) => `https://mubi.com/en/search/films?query=${t(c)}`);
reg([99], (c) => `https://www.shudder.com/search?q=${t(c)}`);
reg([528], (c) => `https://www.espn.com/search/_/q/${t(c)}`);
reg([421], (c) => `https://www.fubo.tv/search?q=${t(c)}`);
reg([299], (c) => `https://www.sling.com/search?q=${t(c)}`);
reg([1771], (c) => `https://tubitv.com/search/${t(c)}`);
reg([538], (c) => `https://watch.plex.tv/search?query=${t(c)}`);
reg([591], (c) => `https://www.canalplus.com/search?q=${t(c)}`);

/* Россия / СНГ (типичные id в выдаче TMDB; пересечения уходят в JustWatch fallback) */
reg([640, 1159, 2549, 3084], (c) => `https://www.kinopoisk.ru/index.php?kp_query=${t(c)}`);
reg([1172], (c) => `https://www.ivi.ru/search/?q=${t(c)}`);
reg([1157], (c) => `https://okko.tv/search?q=${t(c)}`);
reg([894, 1155], (c) => `https://wink.ru/search?query=${t(c)}`);
reg([1160], (c) => `https://start.ru/search?search=${t(c)}`);
reg([556, 2107], (c) => `https://premier.one/search?query=${t(c)}`);

export function justWatchSearchUrl(ctx: StreamingContext): string {
  const loc = ctx.lang === 'ru' ? 'ru' : 'us';
  return `https://www.justwatch.com/${loc}/search?q=${enc(ctx.movieTitle)}`;
}

export function streamingUrlForProvider(providerId: number, ctx: StreamingContext): string {
  const fn = BUILDERS[providerId];
  if (fn) return fn(ctx);
  if (ctx.justWatchPageUrl) return ctx.justWatchPageUrl;
  return justWatchSearchUrl(ctx);
}

export type WatchKind = 'flatrate' | 'rent' | 'buy';

export interface MergedWatchRow {
  readonly provider: TmdbWatchProvider;
  readonly kinds: readonly WatchKind[];
}

const KIND_ORDER: Record<WatchKind, number> = { flatrate: 0, rent: 1, buy: 2 };

export function mergeWatchProviderRows(country: TmdbWatchProviderCountry | null): MergedWatchRow[] {
  if (!country) return [];
  const map = new Map<number, { provider: TmdbWatchProvider; kinds: Set<WatchKind> }>();

  const add = (list: readonly TmdbWatchProvider[] | undefined, kind: WatchKind) => {
    for (const it of list ?? []) {
      const cur = map.get(it.provider_id);
      if (!cur) map.set(it.provider_id, { provider: it, kinds: new Set([kind]) });
      else cur.kinds.add(kind);
    }
  };

  add(country.flatrate, 'flatrate');
  add(country.rent, 'rent');
  add(country.buy, 'buy');

  return [...map.values()]
    .map(({ provider, kinds }) => ({
      provider,
      kinds: [...kinds].sort((a, b) => KIND_ORDER[a] - KIND_ORDER[b]),
    }))
    .sort((a, b) => (a.provider.display_priority ?? 999) - (b.provider.display_priority ?? 999));
}

export interface StreamingHubLink {
  readonly translationKey: string;
  readonly url: string;
}

/** Популярные сервисы: поиск по названию фильма (платные и подписочные). */
export function staticStreamingHubs(ctx: StreamingContext): StreamingHubLink[] {
  const q = enc(ctx.movieTitle);
  const jw = ctx.justWatchPageUrl ?? justWatchSearchUrl(ctx);

  const global: StreamingHubLink[] = [
    { translationKey: 'details.hub.justwatch', url: jw },
    { translationKey: 'details.hub.netflix', url: `https://www.netflix.com/search?q=${q}` },
    { translationKey: 'details.hub.prime', url: `https://www.primevideo.com/search?phrase=${q}` },
    { translationKey: 'details.hub.disney', url: `https://www.disneyplus.com/search?q=${q}` },
    { translationKey: 'details.hub.apple', url: `https://tv.apple.com/search?term=${q}` },
    {
      translationKey: 'details.hub.googleplay',
      url: `https://play.google.com/store/search?q=${q}&c=movies`,
    },
    {
      translationKey: 'details.hub.youtube',
      url: `https://www.youtube.com/results?search_query=${q}`,
    },
    { translationKey: 'details.hub.max', url: `https://www.max.com/search?q=${q}` },
    { translationKey: 'details.hub.hulu', url: `https://www.hulu.com/search?q=${q}` },
    {
      translationKey: 'details.hub.paramount',
      url: `https://www.paramountplus.com/search/?q=${q}`,
    },
    { translationKey: 'details.hub.peacock', url: `https://www.peacocktv.com/search?q=${q}` },
    { translationKey: 'details.hub.imdb', url: `https://www.imdb.com/find?q=${q}&s=tt` },
  ];

  const ru: StreamingHubLink[] = [
    {
      translationKey: 'details.hub.kinopoisk',
      url: `https://www.kinopoisk.ru/index.php?kp_query=${q}`,
    },
    { translationKey: 'details.hub.ivi', url: `https://www.ivi.ru/search/?q=${q}` },
    { translationKey: 'details.hub.okko', url: `https://okko.tv/search?q=${q}` },
    { translationKey: 'details.hub.wink', url: `https://wink.ru/search?query=${q}` },
    { translationKey: 'details.hub.start', url: `https://start.ru/search?search=${q}` },
    { translationKey: 'details.hub.premier', url: `https://premier.one/search?query=${q}` },
  ];

  return ctx.lang === 'ru' ? [...ru, ...global] : global;
}

export function pickDefaultRegionCode(
  results: Record<string, TmdbWatchProviderCountry | undefined>,
  lang: 'ru' | 'en',
): string {
  const hasData = (cc: string) => {
    const p = results[cc];
    return Boolean(p && (p.link || p.flatrate?.length || p.rent?.length || p.buy?.length));
  };

  const preferred =
    lang === 'ru' ? ['RU', 'BY', 'KZ', 'UA', 'US', 'GB'] : ['US', 'GB', 'CA', 'AU', 'RU'];
  for (const c of preferred) {
    if (hasData(c)) return c;
  }

  const keys = Object.keys(results).filter(hasData);
  keys.sort();
  return keys[0] ?? 'US';
}

export function listRegionsWithData(
  results: Record<string, TmdbWatchProviderCountry | undefined>,
): string[] {
  return Object.keys(results)
    .filter((cc) => {
      const p = results[cc];
      return Boolean(p && (p.link || p.flatrate?.length || p.rent?.length || p.buy?.length));
    })
    .sort((a, b) => a.localeCompare(b));
}

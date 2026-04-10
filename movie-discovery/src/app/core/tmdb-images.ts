export type TmdbImageWidth = 45 | 92 | 185 | 342 | 500;

export function tmdbImg(width: TmdbImageWidth, path: string): string {
  const p = (path ?? '').trim();
  if (!p) return '';
  return `/imgtmdb/w${width}${p}`;
}

export function tmdbPosterSrcSet(
  path: string,
  widths: readonly TmdbImageWidth[] = [92, 185, 342],
): string {
  return widths.map((w) => `${tmdbImg(w, path)} ${w}w`).join(', ');
}

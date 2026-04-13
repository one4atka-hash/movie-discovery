import type { Movie } from '@features/movies/data-access/models/movie.model';

export type MyProvidersMap = Record<string, readonly string[]>;

export function filterOnlyMyServices(
  movies: readonly Movie[],
  onlyMyServices: boolean,
  myProviders: MyProvidersMap,
): Movie[] {
  const list = [...movies];
  if (!onlyMyServices) return list;
  return list.filter((m) => (myProviders[String(m.id)] ?? []).length > 0);
}

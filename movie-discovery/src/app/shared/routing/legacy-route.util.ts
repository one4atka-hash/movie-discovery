import type { Params } from '@angular/router';

export function toAbsoluteCommands(target: string): readonly string[] {
  const segments = target.split('/').filter(Boolean);
  return ['/', ...segments];
}

export function mergeLegacyRedirectQueryParams(
  incoming: Params,
  appended?: Params,
): Params | undefined {
  const merged = { ...incoming, ...appended };
  return Object.keys(merged).length ? merged : undefined;
}

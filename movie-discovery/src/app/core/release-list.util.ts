import type { ReleaseSubscription } from '@features/notifications/release-subscriptions.service';

export function todayYyyyMmDd(): string {
  const t = new Date();
  return `${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`;
}

/** Сначала будущие релизы (от ближайшего), затем прошедшие (от недавних к старым). */
export function sortSubscriptionsByRelease(
  subs: readonly ReleaseSubscription[],
): ReleaseSubscription[] {
  const today = todayYyyyMmDd();
  const list = [...subs];
  const upcoming = list
    .filter((s) => s.releaseDate >= today)
    .sort((a, b) => a.releaseDate.localeCompare(b.releaseDate));
  const past = list
    .filter((s) => s.releaseDate < today)
    .sort((a, b) => b.releaseDate.localeCompare(a.releaseDate));
  return [...upcoming, ...past];
}

export function pickSubsPreview(
  subs: readonly ReleaseSubscription[],
  limit: number,
): ReleaseSubscription[] {
  return sortSubscriptionsByRelease(subs).slice(0, limit);
}

export function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    const a = items[i]!;
    const b = items[j]!;
    items[i] = b;
    items[j] = a;
  }
}

export function pickRandomSlice<T>(items: readonly T[], limit: number): T[] {
  const copy = [...items];
  shuffleInPlace(copy);
  return copy.slice(0, limit);
}

import { Injectable, computed, inject, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import type { StreamingPrefs } from './streaming-prefs.model';

const STORAGE_KEY = 'streaming.prefs.v1';

@Injectable({ providedIn: 'root' })
export class StreamingPrefsService {
  private readonly storage = inject(StorageService);
  private readonly _prefs = signal<StreamingPrefs>(this.load());
  readonly prefs = this._prefs.asReadonly();

  readonly region = computed(() => this._prefs().region);
  readonly providers = computed(() => [...this._prefs().providers]);

  setRegion(region: string): void {
    const normalized = region.trim().toUpperCase();
    if (!/^[A-Z]{2}$/.test(normalized)) return;
    this.write({ ...this._prefs(), region: normalized });
  }

  addProvider(name: string): void {
    const normalized = name.trim();
    if (!normalized) return;
    const cur = this._prefs();
    const next = uniq([...cur.providers, normalized]);
    this.write({ ...cur, providers: next });
  }

  removeProvider(name: string): void {
    const cur = this._prefs();
    const next = cur.providers.filter((p) => p.toLowerCase() !== name.toLowerCase());
    this.write({ ...cur, providers: next });
  }

  isMyProvider(providerName: string): boolean {
    const name = providerName.trim().toLowerCase();
    if (!name) return false;
    return this._prefs()
      .providers.map((p) => p.trim().toLowerCase())
      .some((p) => p === name);
  }

  private write(next: StreamingPrefs): void {
    this._prefs.set(next);
    this.storage.set(STORAGE_KEY, next);
  }

  private load(): StreamingPrefs {
    const raw = this.storage.get<unknown>(STORAGE_KEY, null);
    if (!raw || typeof raw !== 'object') {
      return { region: 'US', providers: [] };
    }
    const r = raw as Partial<StreamingPrefs>;
    const region =
      typeof r.region === 'string' && /^[A-Za-z]{2}$/.test(r.region.trim())
        ? r.region.trim().toUpperCase()
        : 'US';
    const providers = Array.isArray(r.providers)
      ? uniq(
          (r.providers as unknown[])
            .filter((x) => typeof x === 'string')
            .map((x) => (x as string).trim())
            .filter(Boolean),
        )
      : [];
    return { region, providers };
  }
}

function uniq(arr: readonly string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const s of arr) {
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
  }
  return out;
}

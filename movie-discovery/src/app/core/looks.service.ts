import { Injectable, signal } from '@angular/core';

const LOOKS_STORAGE_KEY = 'app.looks.v1';
const LOOKS_ACTIVE_KEY = 'app.looks.active.v1';

export type LookVarKey =
  | '--accent'
  | '--accent-hover'
  | '--accent-secondary'
  | '--accent-glow'
  | '--link'
  | '--link-hover';

export type LookConfig = Partial<Record<LookVarKey, string>>;

export type Look = {
  readonly id: string;
  readonly name: string;
  readonly vars: LookConfig;
};

const DEFAULT_LOOKS: readonly Look[] = [
  {
    id: 'sunset',
    name: 'Sunset',
    vars: {
      '--accent': '#ff5a5f',
      '--accent-hover': '#ff7075',
      '--accent-secondary': '#e8b86d',
      '--accent-glow': 'rgba(255, 90, 95, 0.35)',
      '--link': '#f0c27a',
      '--link-hover': '#ffd49a',
    },
  },
  {
    id: 'mint',
    name: 'Mint',
    vars: {
      '--accent': '#22c55e',
      '--accent-hover': '#34d399',
      '--accent-secondary': '#a3e635',
      '--accent-glow': 'rgba(34, 197, 94, 0.28)',
      '--link': '#86efac',
      '--link-hover': '#bbf7d0',
    },
  },
  {
    id: 'violet',
    name: 'Violet',
    vars: {
      '--accent': '#8b5cf6',
      '--accent-hover': '#a78bfa',
      '--accent-secondary': '#f472b6',
      '--accent-glow': 'rgba(139, 92, 246, 0.28)',
      '--link': '#c4b5fd',
      '--link-hover': '#ddd6fe',
    },
  },
];

function safeParseLooks(raw: string | null): Look[] | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;
    const out: Look[] = [];
    for (const it of parsed) {
      if (!it || typeof it !== 'object') continue;
      const o = it as Record<string, unknown>;
      const id = typeof o.id === 'string' ? o.id.trim() : '';
      const name = typeof o.name === 'string' ? o.name.trim() : '';
      const vars =
        o.vars && typeof o.vars === 'object' ? (o.vars as Record<string, unknown>) : null;
      if (!id || !name || !vars) continue;
      const cfg: LookConfig = {};
      for (const k of Object.keys(vars)) {
        if (!k.startsWith('--')) continue;
        const v = vars[k];
        if (typeof v !== 'string' || !v.trim()) continue;
        if (
          k === '--accent' ||
          k === '--accent-hover' ||
          k === '--accent-secondary' ||
          k === '--accent-glow' ||
          k === '--link' ||
          k === '--link-hover'
        ) {
          cfg[k] = v.trim();
        }
      }
      out.push({ id, name, vars: cfg });
    }
    return out.length ? out : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class LooksService {
  readonly looks = signal<readonly Look[]>(DEFAULT_LOOKS);
  readonly activeId = signal<string>(DEFAULT_LOOKS[0]!.id);

  constructor() {
    this.loadFromStorage();
    this.applyActiveToDom();
  }

  setActive(id: string): void {
    const safe = id.trim();
    if (!safe) return;
    if (!this.looks().some((l) => l.id === safe)) return;
    this.activeId.set(safe);
    this.persist();
    this.applyActiveToDom();
  }

  getActive(): Look {
    return this.looks().find((l) => l.id === this.activeId()) ?? this.looks()[0]!;
  }

  private loadFromStorage(): void {
    const storedLooks = safeParseLooks(this.safeGet(LOOKS_STORAGE_KEY));
    if (storedLooks) this.looks.set(storedLooks);
    const active = (this.safeGet(LOOKS_ACTIVE_KEY) ?? '').trim();
    if (active && this.looks().some((l) => l.id === active)) {
      this.activeId.set(active);
    } else {
      this.activeId.set(this.looks()[0]!.id);
    }
  }

  private persist(): void {
    this.safeSet(LOOKS_ACTIVE_KEY, this.activeId());
    this.safeSet(LOOKS_STORAGE_KEY, JSON.stringify(this.looks()));
  }

  private applyActiveToDom(): void {
    if (typeof document === 'undefined') return;
    const look = this.getActive();
    for (const [k, v] of Object.entries(look.vars)) {
      if (!v) continue;
      document.documentElement.style.setProperty(k, v);
    }
  }

  private safeGet(key: string): string | null {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  }

  private safeSet(key: string, value: string): void {
    try {
      localStorage.setItem(key, value);
    } catch {
      /* ignore */
    }
  }
}

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

export type LookDraft = {
  readonly name: string;
  readonly accent: string;
  readonly secondary: string;
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

const BUILTIN_IDS = new Set(DEFAULT_LOOKS.map((l) => l.id));

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

function normalizeHexColor(input: string): string | null {
  const v = input.trim();
  if (/^#[0-9a-fA-F]{6}$/.test(v)) return v.toLowerCase();
  return null;
}

function hexToRgba(hex: string, alpha: number): string {
  const h = hex.replace('#', '');
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = Math.max(0, Math.min(1, alpha));
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function makeVarsFromDraft(d: LookDraft): LookConfig | null {
  const accent = normalizeHexColor(d.accent);
  const secondary = normalizeHexColor(d.secondary);
  if (!accent || !secondary) return null;
  return {
    '--accent': accent,
    '--accent-hover': accent,
    '--accent-secondary': secondary,
    '--accent-glow': hexToRgba(accent, 0.28),
    '--link': secondary,
    '--link-hover': secondary,
  };
}

function newLookId(): string {
  const ts = Date.now().toString(36);
  const rand = Math.random().toString(36).slice(2, 8);
  return `custom-${ts}-${rand}`;
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

  isBuiltin(id: string): boolean {
    return BUILTIN_IDS.has(id);
  }

  createFromDraft(d: LookDraft): { ok: true; id: string } | { ok: false; error: string } {
    const name = d.name.trim();
    if (!name) return { ok: false, error: 'Name is required' };
    const vars = makeVarsFromDraft(d);
    if (!vars) return { ok: false, error: 'Invalid colors' };

    const id = newLookId();
    const next: Look = { id, name, vars };
    this.looks.set([next, ...this.looks()]);
    this.setActive(id);
    this.persist();
    return { ok: true, id };
  }

  updateFromDraft(id: string, d: LookDraft): { ok: true } | { ok: false; error: string } {
    const safeId = id.trim();
    if (!safeId) return { ok: false, error: 'Bad id' };
    const name = d.name.trim();
    if (!name) return { ok: false, error: 'Name is required' };
    const vars = makeVarsFromDraft(d);
    if (!vars) return { ok: false, error: 'Invalid colors' };

    const items = [...this.looks()];
    const idx = items.findIndex((l) => l.id === safeId);
    if (idx === -1) return { ok: false, error: 'Look not found' };
    items[idx] = { id: safeId, name, vars };
    this.looks.set(items);
    this.persist();
    this.applyActiveToDom();
    return { ok: true };
  }

  delete(id: string): { ok: true } | { ok: false; error: string } {
    const safeId = id.trim();
    if (!safeId) return { ok: false, error: 'Bad id' };
    if (this.isBuiltin(safeId)) return { ok: false, error: 'Cannot delete builtin look' };
    const items = this.looks().filter((l) => l.id !== safeId);
    if (!items.length) return { ok: false, error: 'Cannot delete last look' };
    this.looks.set(items);
    if (this.activeId() === safeId) {
      this.activeId.set(items[0]!.id);
    }
    this.persist();
    this.applyActiveToDom();
    return { ok: true };
  }

  toDraft(l: Look): LookDraft {
    const accent = l.vars['--accent'] ?? '#ff5a5f';
    const secondary = l.vars['--accent-secondary'] ?? '#e8b86d';
    return { name: l.name, accent, secondary };
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

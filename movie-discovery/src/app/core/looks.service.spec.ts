import { describe, expect, it, vi, beforeEach } from 'vitest';

import { LooksService } from './looks.service';

function makeDom() {
  const setProperty = vi.fn();
  const classList = { toggle: vi.fn() };
  const style = { setProperty };
  const documentElement = { style, classList } as unknown as HTMLElement;
  (globalThis as any).document = { documentElement };
  return { setProperty };
}

function makeLocalStorage(seed?: Record<string, string>) {
  const mem = new Map<string, string>(Object.entries(seed ?? {}));
  const api = {
    getItem: (k: string) => mem.get(k) ?? null,
    setItem: (k: string, v: string) => mem.set(k, String(v)),
    removeItem: (k: string) => mem.delete(k),
    clear: () => mem.clear(),
  };
  (globalThis as any).localStorage = api;
  return { mem };
}

describe('LooksService', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    makeDom();
    makeLocalStorage();
  });

  it('loads builtin looks by default', () => {
    const svc = new LooksService();
    expect(svc.looks().length).toBeGreaterThan(0);
    expect(svc.activeId()).toBeTruthy();
  });

  it('does not allow creating custom looks when locked', () => {
    const svc = new LooksService();
    expect(svc.unlocked()).toBe(false);
    const r = svc.createFromDraft({ name: 'Mine', accent: '#112233', secondary: '#445566' });
    expect(r.ok).toBe(false);
  });

  it('unlocks and then allows creating custom looks', () => {
    const svc = new LooksService();
    const bad = svc.unlock('123');
    expect(bad.ok).toBe(false);

    const ok = svc.unlock('abcdef');
    expect(ok.ok).toBe(true);
    expect(svc.unlocked()).toBe(true);

    const created = svc.createFromDraft({ name: 'Mine', accent: '#112233', secondary: '#445566' });
    expect(created.ok).toBe(true);
    if (created.ok) {
      expect(svc.activeId()).toBe(created.id);
      expect(svc.looks().some((l) => l.id === created.id)).toBe(true);
    }
  });

  it('prevents deleting builtin looks', () => {
    const svc = new LooksService();
    const builtin = svc.looks()[0]!;
    const r = svc.delete(builtin.id);
    expect(r.ok).toBe(false);
  });

  it('updates a custom look', () => {
    const svc = new LooksService();
    svc.unlock('abcdef');
    const created = svc.createFromDraft({ name: 'Mine', accent: '#112233', secondary: '#445566' });
    if (!created.ok) throw new Error('Expected ok create');

    const upd = svc.updateFromDraft(created.id, {
      name: 'Mine v2',
      accent: '#aabbcc',
      secondary: '#ddeeff',
    });
    expect(upd.ok).toBe(true);
    const look = svc.looks().find((l) => l.id === created.id)!;
    expect(look.name).toBe('Mine v2');
    expect(look.vars['--accent']).toBe('#aabbcc');
    expect(look.vars['--accent-secondary']).toBe('#ddeeff');
  });

  it('loads looks from storage safely (ignores invalid entries)', () => {
    makeLocalStorage({
      'app.looks.v1': JSON.stringify([
        null,
        { id: 'x', name: '', vars: { '--accent': '#111111' } },
        { id: 'ok', name: 'Ok', vars: { '--accent': '#111111', '--accent-secondary': '#222222' } },
      ]),
      'app.looks.active.v1': 'ok',
      'app.looks.unlocked.v1': '1',
    });

    const svc = new LooksService();
    expect(svc.unlocked()).toBe(true);
    expect(svc.looks().some((l) => l.id === 'ok')).toBe(true);
    expect(svc.activeId()).toBe('ok');
  });
});

import { Injectable, computed, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';
import type { AlertRule, InboxItem } from './inbox.model';
import { inboxExplainFromRuleClauses, INBOX_DEMO_RULE_FOR_SAMPLE } from './rule-clause.util';

const ITEMS_KEY = 'inbox.items.v1';
const RULES_KEY = 'inbox.rules.v1';

@Injectable({ providedIn: 'root' })
export class InboxService {
  private readonly _items = signal<InboxItem[]>([]);
  private readonly _rules = signal<AlertRule[]>([]);

  readonly items = this._items.asReadonly();
  readonly rules = this._rules.asReadonly();

  readonly unreadCount = computed(() => this._items().filter((i) => !i.readAt).length);

  readonly itemsSorted = computed(() =>
    [...this._items()].sort((a, b) => b.createdAt - a.createdAt),
  );

  readonly rulesSorted = computed(() =>
    [...this._rules()].sort(
      (a, b) => Number(b.enabled) - Number(a.enabled) || b.updatedAt - a.updatedAt,
    ),
  );

  constructor(private readonly storage: StorageService) {
    this._items.set(readArray<InboxItem>(this.storage, ITEMS_KEY));
    this._rules.set(readArray<AlertRule>(this.storage, RULES_KEY));
  }

  markRead(id: string): void {
    const cur = this._items();
    const idx = cur.findIndex((i) => i.id === id);
    if (idx < 0) return;
    const it = cur[idx]!;
    if (it.readAt) return;
    const next = { ...it, readAt: Date.now() } satisfies InboxItem;
    this.persistItems([...cur.slice(0, idx), next, ...cur.slice(idx + 1)]);
  }

  markAllRead(): void {
    const now = Date.now();
    this.persistItems(this._items().map((i) => (i.readAt ? i : { ...i, readAt: now })));
  }

  addSample(): void {
    const enabled = this._rules().find((r) => r.enabled);
    const explain = enabled
      ? inboxExplainFromRuleClauses(enabled.name, enabled.filters, enabled.channels)
      : inboxExplainFromRuleClauses(
          INBOX_DEMO_RULE_FOR_SAMPLE.name,
          INBOX_DEMO_RULE_FOR_SAMPLE.filters,
          INBOX_DEMO_RULE_FOR_SAMPLE.channels,
        );
    const item: InboxItem = {
      id: crypto.randomUUID(),
      type: 'info',
      title: 'Sample notification',
      body: 'Это локальный MVP Inbox (5.2). Дальше подключим backend rules/feed.',
      explain: [...explain, { label: 'Source', detail: 'Local inbox service' }],
      createdAt: Date.now(),
      readAt: null,
    };
    this.persistItems([item, ...this._items()].slice(0, 50));
  }

  remove(id: string): void {
    this.persistItems(this._items().filter((i) => i.id !== id));
  }

  upsertRule(
    input: Omit<AlertRule, 'id' | 'createdAt' | 'updatedAt'> & { id?: string },
  ): AlertRule {
    const now = Date.now();
    const id = input.id ?? crypto.randomUUID();
    const name = input.name.trim();
    if (!name) throw new Error('name required');
    const cur = this._rules();
    const existing = cur.find((r) => r.id === id);
    const next: AlertRule = {
      id,
      name,
      enabled: input.enabled,
      filters: {
        minRating: input.filters.minRating ?? null,
        genres: input.filters.genres ?? null,
        maxRuntime: input.filters.maxRuntime ?? null,
        languages: input.filters.languages ?? null,
        providerKeys: input.filters.providerKeys ?? null,
      },
      channels: { ...input.channels },
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
    };
    const idx = cur.findIndex((r) => r.id === id);
    const out = idx >= 0 ? [...cur.slice(0, idx), next, ...cur.slice(idx + 1)] : [next, ...cur];
    this.persistRules(out);
    return next;
  }

  removeRule(id: string): void {
    this.persistRules(this._rules().filter((r) => r.id !== id));
  }

  private persistItems(next: InboxItem[]): void {
    this._items.set(next);
    this.storage.set(ITEMS_KEY, next);
  }

  private persistRules(next: AlertRule[]): void {
    this._rules.set(next);
    this.storage.set(RULES_KEY, next);
  }
}

function readArray<T>(storage: StorageService, key: string): T[] {
  const raw = storage.get<unknown>(key, []);
  return Array.isArray(raw) ? (raw as T[]) : [];
}

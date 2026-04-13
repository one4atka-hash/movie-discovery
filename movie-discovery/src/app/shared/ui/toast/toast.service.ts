import { Injectable, signal } from '@angular/core';

export type ToastKind = 'info' | 'success' | 'warning' | 'error';

export interface ToastItem {
  id: string;
  kind: ToastKind;
  title: string;
  message?: string;
  createdAt: number;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private readonly _items = signal<ToastItem[]>([]);
  readonly items = this._items.asReadonly();

  show(kind: ToastKind, title: string, message?: string, ttlMs = 3500): void {
    const item: ToastItem = {
      id: crypto.randomUUID(),
      kind,
      title,
      message,
      createdAt: Date.now(),
    };
    this._items.update((arr) => [item, ...arr].slice(0, 5));
    window.setTimeout(() => this.dismiss(item.id), ttlMs);
  }

  dismiss(id: string): void {
    this._items.update((arr) => arr.filter((t) => t.id !== id));
  }
}

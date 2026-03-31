import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ErrorNotifierService {
  readonly message = signal<string | null>(null);
  private retryAction: (() => void) | null = null;

  show(message: string, retry?: () => void): void {
    this.message.set(message);
    this.retryAction = retry ?? null;
  }

  clear(): void {
    this.message.set(null);
    this.retryAction = null;
  }

  retry(): void {
    this.retryAction?.();
    this.clear();
  }
}


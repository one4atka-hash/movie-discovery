import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class LoggerService {
  log(message: unknown, ...optional: unknown[]): void {
    console.log('[LOG]', message, ...optional);
  }

  warn(message: unknown, ...optional: unknown[]): void {
    console.warn('[WARN]', message, ...optional);
  }

  error(message: unknown, ...optional: unknown[]): void {
    console.error('[ERROR]', message, ...optional);
  }
}


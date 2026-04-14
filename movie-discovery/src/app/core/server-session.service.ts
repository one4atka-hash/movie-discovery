import { Injectable, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs';
import {
  ServerCinemaApiService,
  type ServerAuthedUser,
  type ServerAuthResponse,
} from './server-cinema-api.service';

@Injectable({ providedIn: 'root' })
export class ServerSessionService {
  private readonly api = inject(ServerCinemaApiService);

  readonly busy = signal(false);
  readonly err = signal<string | null>(null);
  readonly me = signal<ServerAuthedUser | null>(null);

  readonly connected = computed(() => Boolean(this.me()));

  refreshMe(input?: { silent?: boolean }): void {
    if (!input?.silent) this.err.set(null);
    this.busy.set(true);
    this.api
      .authMe()
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (me) => {
          this.me.set(me);
          if (!me && !input?.silent) {
            this.err.set('Not connected (invalid token or server unavailable).');
          }
        },
        error: () => {
          this.me.set(null);
          if (!input?.silent) this.err.set('Failed to check server status.');
        },
      });
  }

  login(email: string, password: string): void {
    this.err.set(null);
    const e = email.trim();
    if (!e || !password) {
      this.err.set('Email and password are required.');
      return;
    }
    this.busy.set(true);
    this.api
      .authLogin(e, password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (res) => this.onAuthResponse(res, 'Login failed.'),
        error: () => this.err.set('Login failed.'),
      });
  }

  register(email: string, password: string): void {
    this.err.set(null);
    const e = email.trim();
    if (!e || !password) {
      this.err.set('Email and password are required.');
      return;
    }
    this.busy.set(true);
    this.api
      .authRegister(e, password)
      .pipe(finalize(() => this.busy.set(false)))
      .subscribe({
        next: (res) => this.onAuthResponse(res, 'Registration failed.'),
        error: () => this.err.set('Registration failed.'),
      });
  }

  disconnect(): void {
    this.err.set(null);
    this.api.clearToken();
    this.me.set(null);
  }

  private onAuthResponse(res: ServerAuthResponse | null, fallbackErr: string): void {
    if (!res?.token) {
      this.err.set(fallbackErr);
      return;
    }
    this.api.setToken(res.token);
    this.me.set(res.user ?? null);
  }
}

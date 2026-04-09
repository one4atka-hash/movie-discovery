import { Injectable, inject, signal } from '@angular/core';

import { StorageService } from '@core/storage.service';

export interface AuthUser {
  readonly id: string;
  readonly email: string;
}

interface StoredUser {
  readonly id: string;
  readonly email: string;
  readonly saltB64: string;
  readonly hashB64: string;
  readonly iterations: number;
}

const USERS_KEY = 'auth.users.v1';
const SESSION_KEY = 'auth.session.v1';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly storage = inject(StorageService);

  private readonly _user = signal<AuthUser | null>(this.loadSession());
  readonly user = this._user.asReadonly();

  isAuthenticated(): boolean {
    return Boolean(this._user());
  }

  async register(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) throw new Error('Email обязателен.');
    if (password.trim().length < 6) throw new Error('Пароль должен быть минимум 6 символов.');

    const users = this.loadUsers();
    if (users.some((u) => u.email === normalizedEmail)) {
      throw new Error('Пользователь с таким email уже существует.');
    }

    const salt = crypto.getRandomValues(new Uint8Array(16));
    const iterations = 200_000;
    const hash = await pbkdf2Sha256(password, salt, iterations);

    const stored: StoredUser = {
      id: crypto.randomUUID(),
      email: normalizedEmail,
      saltB64: b64(salt),
      hashB64: b64(hash),
      iterations
    };

    users.push(stored);
    this.storage.set(USERS_KEY, users);

    const session: AuthUser = { id: stored.id, email: stored.email };
    this.storage.set(SESSION_KEY, session);
    this._user.set(session);
    return session;
  }

  async login(email: string, password: string): Promise<AuthUser> {
    const normalizedEmail = email.trim().toLowerCase();
    const users = this.loadUsers();
    const found = users.find((u) => u.email === normalizedEmail);
    if (!found) throw new Error('Неверный email или пароль.');

    const salt = fromB64(found.saltB64);
    const expected = found.hashB64;
    const actual = b64(await pbkdf2Sha256(password, salt, found.iterations));
    if (!timingSafeEqual(expected, actual)) throw new Error('Неверный email или пароль.');

    const session: AuthUser = { id: found.id, email: found.email };
    this.storage.set(SESSION_KEY, session);
    this._user.set(session);
    return session;
  }

  logout(): void {
    this.storage.remove(SESSION_KEY);
    this._user.set(null);
  }

  private loadUsers(): StoredUser[] {
    return (this.storage.get<StoredUser[]>(USERS_KEY) ?? []).filter((u) => Boolean(u?.id && u?.email));
  }

  private loadSession(): AuthUser | null {
    const s = this.storage.get<AuthUser>(SESSION_KEY);
    if (!s?.id || !s?.email) return null;
    return { id: s.id, email: s.email };
  }
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let out = 0;
  for (let i = 0; i < a.length; i++) out |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return out === 0;
}

async function pbkdf2Sha256(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  // Ensure we pass a real ArrayBuffer (not SharedArrayBuffer / ArrayBufferLike) to satisfy TS BufferSource typing.
  // Copying guarantees `.buffer` is an ArrayBuffer in TS libs.
  const saltCopy = Uint8Array.from(salt);
  const saltBuf: ArrayBuffer = saltCopy.buffer;
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: saltBuf, iterations },
    keyMaterial,
    256
  );
  return new Uint8Array(bits);
}

function b64(bytes: Uint8Array): string {
  let s = '';
  bytes.forEach((x) => (s += String.fromCharCode(x)));
  return btoa(s);
}

function fromB64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}


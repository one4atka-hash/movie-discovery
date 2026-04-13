import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { firstValueFrom } from 'rxjs';

import { StorageService } from './storage.service';

const SERVER_JWT_KEY = 'server.jwt.token.v1';

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

@Injectable({ providedIn: 'root' })
export class ServerPushSyncService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);

  /**
   * If Server JWT + VAPID public key are available, register SW, subscribe, POST /api/push/subscribe.
   * No-op otherwise; errors are swallowed (local release reminders keep working).
   */
  async registerIfPossible(): Promise<void> {
    const token = this.storage.get<string>(SERVER_JWT_KEY, '')?.trim();
    if (!token) return;
    if (!('serviceWorker' in navigator) || !('PushManager' in window)) return;

    try {
      const cfg = await firstValueFrom(
        this.http.get<{ publicKey: string | null }>('/api/push/vapid-public'),
      );
      const pub = cfg?.publicKey?.trim();
      if (!pub) return;

      const reg = await navigator.serviceWorker.register('/sw.js', {
        scope: '/',
      });
      await reg.update();

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(pub) as BufferSource,
        });
      }

      const json = sub.toJSON() as {
        endpoint: string;
        keys?: { p256dh?: string; auth?: string };
      };
      const p256dh = json.keys?.p256dh;
      const auth = json.keys?.auth;
      if (!json.endpoint || !p256dh || !auth) return;

      await firstValueFrom(
        this.http.post<{ ok: boolean; id: string }>(
          '/api/push/subscribe',
          {
            endpoint: json.endpoint,
            keys: { p256dh, auth },
          },
          {
            headers: { Authorization: `Bearer ${token}` },
          },
        ),
      );
    } catch (e) {
      console.warn('[ServerPushSync] register skipped:', e);
    }
  }
}

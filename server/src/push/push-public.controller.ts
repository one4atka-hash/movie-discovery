import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Controller('push')
export class PushPublicController {
  constructor(private readonly config: ConfigService) {}

  /** Public VAPID key for `PushManager.subscribe` (optional until outbound push is configured). */
  @Get('vapid-public')
  vapidPublic(): { publicKey: string | null } {
    const k = this.config.get<string>('VAPID_PUBLIC_KEY')?.trim();
    return { publicKey: k && k.length > 0 ? k : null };
  }
}

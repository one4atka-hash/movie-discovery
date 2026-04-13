import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { truthy } from '../config/env.schema';
import { DbService } from '../db/db.service';
import { StreamingService } from '../streaming/streaming.service';
import { AvailabilityService } from './availability.service';

/**
 * When AVAILABILITY_CRON_ENABLED=1 and TMDB_API_KEY is set, periodically fetches
 * watch providers for each distinct (tmdb_id, region) in availability_track and
 * runs ingest (diff → per-user events).
 */
@Injectable()
export class AvailabilityCronService implements OnModuleInit, OnModuleDestroy {
  private readonly log = new Logger(AvailabilityCronService.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly config: ConfigService,
    private readonly db: DbService,
    private readonly availability: AvailabilityService,
    private readonly streaming: StreamingService,
  ) {}

  onModuleInit(): void {
    if (!truthy(this.config.get<string>('AVAILABILITY_CRON_ENABLED'))) return;

    const ms = Number(
      this.config.get<string>('AVAILABILITY_CRON_INTERVAL_MS') ?? 3_600_000,
    );
    this.log.log(`Availability sync scheduled every ${ms} ms`);
    void this.tick();
    this.timer = setInterval(() => void this.tick(), ms);
  }

  onModuleDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private async tick(): Promise<void> {
    const apiKey = (this.config.get<string>('TMDB_API_KEY') ?? '').trim();
    if (!apiKey) {
      this.log.warn('TMDB_API_KEY missing; skipping availability sync tick');
      return;
    }

    const rows = await this.db.query<{ tmdb_id: number; region: string }>(
      `select distinct tmdb_id, region from availability_track`,
    );
    if (!rows.length) return;

    for (const r of rows) {
      try {
        const providers = await this.streaming.getMovieProviderNames(
          r.tmdb_id,
          r.region,
        );
        await this.availability.ingestSnapshot({
          tmdbId: r.tmdb_id,
          region: r.region,
          providers,
        });
      } catch (e) {
        this.log.warn(
          `Availability sync failed tmdb=${r.tmdb_id} region=${r.region}: ${String(e)}`,
        );
      }
      await new Promise((resolve) => setTimeout(resolve, 250));
    }
  }
}

import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { APP_GUARD } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';
import { parseEnv } from './config/env.schema';
import { RequestIdMiddleware } from './common/request-id.middleware';

import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DbModule } from './db/db.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { FavoritesModule } from './favorites/favorites.module';
import { FeedbackModule } from './feedback/feedback.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { AlertsModule } from './alerts/alerts.module';
import { MeModule } from './me/me.module';
import { WatchStateModule } from './watch-state/watch-state.module';
import { DiaryModule } from './diary/diary.module';
import { CollectionsModule } from './collections/collections.module';
import { StreamingModule } from './streaming/streaming.module';
import { DecisionModule } from './decision/decision.module';
import { ImportsModule } from './imports/imports.module';
import { ExportsModule } from './exports/exports.module';
import { TasteModule } from './taste/taste.module';
import { AvailabilityModule } from './availability/availability.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: (raw) => parseEnv(raw),
    }),
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [
          {
            ttl: Number(config.get<string>('THROTTLE_TTL_SECONDS')) * 1000,
            limit: Number(config.get<string>('THROTTLE_LIMIT')),
          },
        ],
      }),
    }),
    DbModule,
    HealthModule,
    AuthModule,
    FavoritesModule,
    FeedbackModule,
    SubscriptionsModule,
    RecommendationsModule,
    AlertsModule,
    MeModule,
    WatchStateModule,
    DiaryModule,
    CollectionsModule,
    StreamingModule,
    DecisionModule,
    ImportsModule,
    ExportsModule,
    TasteModule,
    AvailabilityModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestIdMiddleware).forRoutes('*');
  }
}

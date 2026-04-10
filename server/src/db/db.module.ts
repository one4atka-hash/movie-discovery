import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Pool } from 'pg';

import { DbService } from './db.service';
import { MigrationsService } from './migrations.service';

@Global()
@Module({
  providers: [
    {
      provide: Pool,
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const url = config.get<string>('DATABASE_URL');
        if (!url) {
          throw new Error('DATABASE_URL is required');
        }
        return new Pool({
          connectionString: url,
        });
      },
    },
    DbService,
    MigrationsService,
  ],
  exports: [Pool, DbService],
})
export class DbModule {}
